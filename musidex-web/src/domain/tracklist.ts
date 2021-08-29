import {Setter} from "../components/utils";
import {Dispatch, useCallback} from "react";
import {buildTrack, TrackPlayerAction} from "./trackplayer";
import {canPlay, dot, MusidexMetadata} from "./entity";

interface Tracklist {
    last_played: number[],
    last_played_maxsize: number,
}

export function emptyTracklist(): Tracklist {
    return {
        last_played: [],
        last_played_maxsize: 100,
    }
}

export type NextTrackCallback = (id?: number) => void;
export type PrevTrackCallback = () => void;

export function useNextTrackCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata, current?: number): NextTrackCallback {
    return useCallback((id) => {
        const list = {
            ...curlist,
        };
        if (current !== undefined) {
            if (list.last_played.length > list.last_played_maxsize) {
                list.last_played = list.last_played.slice(1);
            }
            list.last_played.push(current);
        }

        if (id === undefined) {
            let maxscore = undefined;
            let maxmusic = undefined;

            let lastplayedvec = metadata.embeddings.get(list.last_played[list.last_played.length-1] || (current || -1));

            for (let music of metadata.musics) {
                let tags = metadata.music_tags_idx.get(music);
                if (tags === undefined || !canPlay(tags)) {
                    continue;
                }
                let score = Math.random() * 0.01;
                if (list.last_played.lastIndexOf(music) >= 0) {
                    score -= 5;
                }
                let emb = metadata.embeddings.get(music);
                if (emb !== undefined && lastplayedvec !== undefined) {
                    score += dot(lastplayedvec, emb) / (lastplayedvec.mag * emb.mag);
                }
                if (maxscore === undefined || score > maxscore) {
                    maxscore = score;
                    maxmusic = music;
                }
                console.log(music, score);
            }

            id = maxmusic;
        }

        setList(list);
        if (id !== undefined) {
            const track = buildTrack(id, metadata);
            if (track === undefined) {
                return;
            }
            dispatch({action: "play", track: track})
        }
    }, [curlist, setList, metadata, current, dispatch])
}

export function usePrevTrackCallback(curlist: Tracklist, setList: Setter<Tracklist>, dispatch: Dispatch<TrackPlayerAction>, metadata: MusidexMetadata): PrevTrackCallback {
    return useCallback(() => {
        const list = {
            ...curlist,
        };
        const prev_music = list.last_played.pop();

        if (prev_music !== undefined) {
            setList(list);
            let tags = metadata.music_tags_idx.get(prev_music) || new Map();
            dispatch({action: "play", track: {id: prev_music, tags: tags}})
        }
    }, [curlist, setList, metadata, dispatch])
}

export function useCanPrev(curlist: Tracklist): () => boolean {
    return useCallback(() => {
        return curlist.last_played.length === 0;
    }, [curlist])
}

export default Tracklist;