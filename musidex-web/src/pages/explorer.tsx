import './explorer.css'
import {MetadataCtx, Tag} from "../domain/api";
import {Fragment, useContext} from "react";
import {PlayButton} from "../components/playbutton";

export type ExplorerProps = {
    title: string;
    hidden: boolean;
}

const Explorer = (props: ExplorerProps) => {
    const metadata = useContext(MetadataCtx);
    return (
        <div className={"explorer color-fg " + (props.hidden ? "hidden" : "")}>
            <div className="explorer-title title">{props.title}</div>
            {
                metadata.musics.map((music) => {
                    return (
                        <SongElem key={music.id} musicID={music.id}
                                  tags={metadata.music_tags_idx.get(music.id)}/>
                    )
                })
            }
        </div>
    )
}

type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag> | undefined;
}

const SongElem = (props: SongElemProps) => {
    if (props.tags === undefined) {
        return <Fragment/>;
    }
    return (
        <div className="song-elem">
            <div style={{width: "80px", height: "80px", backgroundColor: "gray"}}/>
            <div style={{flex: "1", padding: "10px"}}>
                <b>
                    {props.tags.get("title")?.text || "No Title"}
                </b>
            </div>
            <div style={{flex: "1", padding: "10px", textAlign: "right"}}>
                <PlayButton musicID={props.musicID}/>
            </div>
        </div>
    )
}



export default Explorer;