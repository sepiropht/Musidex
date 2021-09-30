import {FlatList, Image, SafeAreaView, StatusBar, StyleSheet, View} from "react-native";
import React, {useCallback, useContext} from "react";
import {Tag} from "../common/entity";
import {TextFg} from "./StyledText";
import Colors from "../constants/Colors";
import API from "../common/api";
import {MetadataCtx} from "../constants/Contexts";
import SmallPlayer from "./SmallPlayer";

export default function Explorer() {
    const [metadata] = useContext(MetadataCtx);

    const renderSong = useCallback(({item}: { item: number }) => {
        return <SongElem musicID={item} tags={metadata.getTags(item) || new Map()}/>
    }, [metadata]);

    return (
        <SafeAreaView style={styles.container}>
            <FlatList data={metadata.musics}
                      renderItem={renderSong}
                      keyExtractor={(item) => item.toString()}
            style={styles.musiclist}/>
            <SmallPlayer style={styles.player}/>
        </SafeAreaView>
    )
}


type SongElemProps = {
    musicID: number;
    tags: Map<string, Tag>;
}

const SongElem = (props: SongElemProps) => {
    let cover = props.tags?.get("compressed_thumbnail")?.text || (props.tags?.get("thumbnail")?.text || "");

    const title = props.tags.get("title") || {music_id: props.musicID, key: "title", text: "No Title"};
    const artist = props.tags.get("artist") || {music_id: props.musicID, key: "artist", text: "Unknown Artist"};

    return (
        <View style={styles.item}>
            <Image style={styles.itemImage} source={{uri: API.getAPIUrl() + "/storage/" + cover}} />
            <View style={styles.trackInfo}>
                <TextFg>{title?.text}</TextFg>
                <TextFg>{artist?.text}</TextFg>
            </View>
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Colors.bg,
    },
    player: {
        flexBasis: 60,
        flexGrow: 0,
    },
    trackInfo: {
        padding: 10,
    },
    itemImage: {
        width: 60,
        height: 60,
    },
    item: {
        backgroundColor: Colors.fg,
        display: "flex",
        flexDirection: "row",
        marginVertical: 4,
        marginHorizontal: 5,
        borderRadius: 5,
        overflow: "hidden",
    },
    musiclist: {
        flexBasis: 100,
        flexGrow: 1,
    }
})