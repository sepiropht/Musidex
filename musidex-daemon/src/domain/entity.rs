use chrono::{DateTime, Utc};
use rusqlite::types::ToSqlOutput;
use rusqlite::{Row, ToSql};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt::{Debug, Display, Formatter};
use std::ops::Deref;

#[derive(Copy, Clone, PartialEq, Eq, Serialize, Deserialize, Debug)]
#[serde(transparent)]
pub struct MusicID(pub i32);

#[derive(Copy, Clone, PartialEq, Eq, Debug, Serialize, Deserialize)]
pub struct Music {
    pub id: MusicID,
}

#[derive(Clone, Debug, PartialEq, Serialize, Deserialize)]
pub struct Tag {
    pub music_id: MusicID,
    pub key: TagKey,

    pub text: Option<String>,
    pub integer: Option<i32>,
    pub date: Option<DateTime<Utc>>,
    pub vector: Option<Vec<f32>>,
}

impl Eq for Tag {}

#[derive(Serialize)]
pub struct MusidexMetadata {
    pub musics: Vec<Music>,
    pub tags: Vec<Tag>,
}

macro_rules! tag_key {
    {
     $($key:ident => $name:literal,)+
    } => {
        #[derive(Clone, Debug, PartialEq, Eq)]
        pub enum TagKey {
            $($key,)+
            Other(String)
        }

        impl<'a> From<&'a str> for TagKey {
            fn from(v: &'a str) -> TagKey {
                match v {
                    $($name => TagKey::$key,)+
                    s => TagKey::Other(s.to_string()),
                }
            }
        }

        impl<'a> Into<String> for &'a TagKey {
            fn into(self) -> String {
                match self {
                    $(TagKey::$key => ($name).to_string(),)+
                    TagKey::Other(s) => s.clone(),
                }
            }
        }

        impl ToSql for TagKey {
            fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
                match self {
                    $(TagKey::$key => ($name).to_sql(),)+
                    TagKey::Other(s) => s.to_sql(),
                }
            }
       }
    }
}

tag_key! {
    LocalMP3 => "local_mp3",
    LocalWEBM => "local_webm",
    LocalM4A => "local_m4a",
    LocalOGG => "local_ogg",
    YoutubeVideoID => "youtube_video_id",
    YoutubeURL => "youtube_url",
    Title => "title",
    Thumbnail => "thumbnail",
    Duration => "duration",
}

impl Display for TagKey {
    fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
        let s: String = self.into();
        std::fmt::Display::fmt(&s, f)
    }
}

impl<'de> Deserialize<'de> for TagKey {
    fn deserialize<D>(deserializer: D) -> std::result::Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        let v = <&str>::deserialize(deserializer)?;
        Ok(v.into())
    }
}

impl Serialize for TagKey {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        let s: String = self.into();
        s.serialize(serializer)
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Music {
    fn from(row: &'a Row<'b>) -> Self {
        Music {
            id: MusicID(row.get_unwrap("id")),
        }
    }
}

impl<'a, 'b> From<&'a Row<'b>> for Tag {
    fn from(row: &'a Row<'b>) -> Self {
        Self {
            music_id: MusicID(row.get_unwrap("music_id")),
            key: row.get_unwrap::<_, String>("key").deref().into(),
            text: row.get_unwrap("text"),
            integer: row.get_unwrap("integer"),
            date: row
                .get_unwrap::<_, Option<String>>("date")
                .and_then(|v| DateTime::parse_from_rfc3339(&v).ok().map(Into::into)),
            vector: row
                .get_unwrap::<_, Option<Vec<u8>>>("vector")
                .map(|x| x.iter().map(|&x| x as f32).collect()),
        }
    }
}
