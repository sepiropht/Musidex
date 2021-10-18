import {emptyMetadata, MusidexMetadata} from "../common/entity";
import React from "react";
import Tracklist, {emptyTracklist, NextTrackCallback, PrevTrackCallback, TrackPlayerAction} from "../common/tracklist";
import TrackPlayer, {newTrackPlayer} from "../domain/trackplayer";
import {Dispatch} from "../common/utils";
import {newSearchForm, SearchForm} from "../common/filters";

export default {
    Metadata: React.createContext<[MusidexMetadata,() => Promise<void>]>([emptyMetadata(), async () => {}]),
    Trackplayer: React.createContext<[TrackPlayer, Dispatch<TrackPlayerAction>]>([newTrackPlayer(), _ => _]),
    Controls: React.createContext<[NextTrackCallback, PrevTrackCallback, () => void]>([_ => {}, () => {}, () => {}]),
    SearchForm: React.createContext<[SearchForm, (newv: SearchForm) => void]>([newSearchForm(), _ => _]),
    SelectedMusics: React.createContext<number[]>([]),
    Tracklist: React.createContext<Tracklist>(emptyTracklist()),
    User: React.createContext<[number | undefined,(newv: number | undefined) => void]>([0, _ => _]),
    APIUrl: React.createContext<[string,(newv: string) => void]>(["", _ => _]),
};
