use crate::domain::entity::{MusicID, Source};
use crate::utils::get_file_range;
use anyhow::{Context, Result};
use deadpool_postgres::tokio_postgres::Client;
use hyper::http::HeaderValue;

pub struct MusicMetadata {
    pub buf: Vec<u8>,
    pub range_size: (u64, u64, u64),
    pub content_type: &'static str,
}

pub async fn stream_music(
    c: &Client,
    id: MusicID,
    range: Option<&HeaderValue>,
) -> Result<MusicMetadata> {
    let sources = c
        .query("SELECT * FROM source WHERE music_id=$1", &[&id.0])
        .await?;

    let mut source_path = None;
    for row in sources {
        let source = Source::from(row);
        if source.format == "local_mp3"
            || source.format == "local_ogg"
            || source.format == "local_m4a"
        {
            source_path = Some(source.url);
            break;
        }
    }
    let source_path = source_path.context("no streamable source found")?;

    let content_type = if source_path.ends_with("mp3") {
        "audio/mpeg"
    } else if source_path.ends_with("ogg") {
        "audio/ogg"
    } else if source_path.ends_with("m4a") {
        "audio/mp4"
    } else {
        ""
    };

    let file_path = format!("./storage/{}", source_path);

    if let Some(rangev) = range {
        let range = http_range::HttpRange::parse_bytes(rangev.as_bytes(), u32::MAX as u64)
            .map_err(|_| anyhow!("could not decode range"))?;
        log::info!(
            "asked with range {:?}: {}",
            range[0],
            rangev.to_str().unwrap()
        );
        let r = range.get(0).context("no ranges")?;
        let buf = get_file_range(file_path, (r.start, r.start + r.length))?;
        let len = r.start + buf.len() as u64;
        let range_size = (
            r.start,
            (r.start + r.length).min(len.saturating_sub(1)),
            len,
        );
        return Ok(MusicMetadata {
            buf,
            range_size,
            content_type,
        });
    }

    let buf = std::fs::read(file_path).context("failed reading source")?;
    let l = buf.len() as u64;
    let range_size = (0, l.saturating_sub(1), l);
    Ok(MusicMetadata {
        buf,
        range_size,
        content_type,
    })
}