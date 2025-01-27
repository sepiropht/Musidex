import React from "react";
import API from "../common/api";
import {NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import {getTags, MusidexMetadata} from "../common/entity";
import {Dispatch} from "../common/utils";
import {onYTInputChange, YTSendState} from "../pages/submit";

type TrackPlayer = {
    current: number | undefined;
    duration: number;
    paused: boolean;
    loading: boolean;
    loop: boolean;
    pauseatend: boolean;
    audio: HTMLAudioElement;
}


export function newTrackPlayer(): TrackPlayer {
    let audio = new Audio();
    audio.preload = "auto";
    audio.autoplay = true;
    // @ts-ignore
    audio.fetchpriority = 'high';
    return {
        current: undefined,
        audio: audio,
        duration: 0,
        paused: true,
        loop: false,
        pauseatend: false,
        loading: false,
    }
}

let lastPaste = 0;

export function setupListeners(trackplayer: TrackPlayer, metadata: MusidexMetadata, doNext: NextTrackCallback, doPrev: PrevTrackCallback, dispatch: Dispatch<TrackPlayerAction>, setPasteYTUploadState: (state: YTSendState) => void) {
    trackplayer.audio.onloadeddata = () => dispatch({action: "audioTick"});
    trackplayer.audio.onplaying = () => dispatch({action: "audioTick"});
    trackplayer.audio.onpause = () => dispatch({action: "audioTick"});
    trackplayer.audio.onended = () => {
        if (trackplayer.loop || trackplayer.pauseatend) {
            return;
        }
        doNext();
    }
    trackplayer.audio.oncanplay = () => {
        trackplayer.loading = false;
        if (!trackplayer.paused) {
            trackplayer.audio.play()?.catch((e) => console.log(e));
        }
    }
    trackplayer.audio.onloadedmetadata = () => {
        trackplayer.loading = false;
        if (!trackplayer.paused) {
            trackplayer.audio.play()?.catch((e) => console.log(e));
        }
    }
    trackplayer.audio.oncanplaythrough = () => {
        trackplayer.loading = false;
        if (!trackplayer.paused) {
            trackplayer.audio.play()?.catch((e) => console.log(e));
        }
    }
    trackplayer.audio.onplay = () => {
        trackplayer.loading = false;
    }
    if ('mediaSession' in navigator) {
        let curtags = getTags(metadata, trackplayer.current);
        let artwork = [];
        let thumb = curtags?.get("thumbnail")?.text;
        if (thumb) {
            artwork.push({src: "storage/" + thumb, type: 'image/jpeg'});
        }
        let title = curtags?.get("title")?.text || "No Title";
        trackplayer.audio.title = title;
        navigator.mediaSession.metadata = new MediaMetadata({
            title: title,
            artist: curtags?.get("artist")?.text || "No Artist",
            artwork: artwork,
        });

        navigator.mediaSession.setActionHandler('play', () => doNext(trackplayer.current));
        navigator.mediaSession.setActionHandler('pause', () => doNext(trackplayer.current));
        navigator.mediaSession.setActionHandler('seekto', (e) => {
            if (e.seekTime) {
                dispatch(({action: "setTime", time: e.seekTime}))
            }
        });
        navigator.mediaSession.setActionHandler('previoustrack', doPrev);
        navigator.mediaSession.setActionHandler('nexttrack', () => doNext());
    }

    document.body.onkeydown = (e) => {
        if (e.target !== document.body) {
            return;
        }
        if (e.code === "Space" || e.code === "KeyK") {
            e.preventDefault();
            if (!trackplayer.current) {
                doNext();
                return;
            }
            dispatch({action: "play", id: trackplayer.current});
        }
        if (e.code === "ArrowRight") {
            e.preventDefault();
            if (trackplayer.audio.currentTime + 5 >= trackplayer.duration) {
                doNext();
                return;
            }
            dispatch({action: "setTime", time: trackplayer.audio.currentTime + 5});
        }
        if (e.code === "ArrowLeft") {
            e.preventDefault();
            if (trackplayer.audio.currentTime - 5 <= 0) {
                doPrev();
                return;
            }
            dispatch({action: "setTime", time: trackplayer.audio.currentTime - 5});
        }
    };
    document.body.onpaste = (e) => {
        if (Date.now() - lastPaste < 1000) {
            return;
        }
        lastPaste = Date.now();
        // @ts-ignore
        if (e.target?.tagName?.toUpperCase() === 'INPUT') {
            return;
        }
        if (e.clipboardData?.types.includes("text/plain")) {
            let text = e.clipboardData.getData("text/plain");
            onYTInputChange(text, () => {
            }, setPasteYTUploadState, API.youtubeUpload);
        }
    };
}


export function applyTrackPlayer(trackplayer: TrackPlayer, action: TrackPlayerAction): TrackPlayer {
    switch (action.action) {
        case "play":
            if (action.id < 0) return trackplayer;
            if (trackplayer.current === action.id) {
                if (trackplayer.paused) {
                    trackplayer.audio.play().catch((e) => console.log(e));
                } else {
                    trackplayer.audio.pause();
                }
                return {
                    ...trackplayer,
                    loading: trackplayer.paused,
                    paused: !trackplayer.paused,
                }
            }
            let url = new URL(window.location.href);
            url.searchParams.set("m", action.id.toString());
            url.searchParams.delete("t");
            window.history.replaceState({}, "", url.toString());

            trackplayer.audio.src = API.getStreamSrc(action.id);
            trackplayer.audio.load();
            if(action.seek) {
                trackplayer.audio.currentTime = action.seek;
            }
            const duration = action.tags?.get("duration")?.integer;
            return {
                ...trackplayer,
                current: action.id,
                duration: duration || 0,
                loading: true,
                paused: false,
            }
        case "pause":
            if(action.pauseAtEnd !== undefined ) {
                return {
                    ...trackplayer,
                    pauseatend: action.pauseAtEnd,
                }
            }
            trackplayer.audio.pause();
            return {
                ...trackplayer,
                paused: true,
                pauseatend: false,
            }
        case "loop":
            trackplayer.audio.loop = action.shouldLoop;
            return {
                ...trackplayer,
                loop: action.shouldLoop,
            }
        case "setTime":
            trackplayer.audio.currentTime = action.time;
            return {
                ...trackplayer
            }
        case "audioTick":
            if (trackplayer.current === undefined) return trackplayer;
            if (trackplayer.audio.ended) {
                trackplayer.paused = true;
            }
            if (trackplayer.audio.duration) {
                trackplayer.duration = trackplayer.audio.duration;
            }
            if ('mediaSession' in navigator) {
                navigator.mediaSession.setPositionState({
                    duration: trackplayer.duration,
                    position: trackplayer.audio.currentTime,
                });
            }
            return {
                ...trackplayer,
            }
    }
    return trackplayer
}

export const TrackplayerCtx = React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]);
export default TrackPlayer;