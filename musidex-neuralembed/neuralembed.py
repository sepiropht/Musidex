from extractor import extractor
import sqlite3 as sqlite
import numpy as np
import struct

conn = sqlite.connect("storage/db.db")

conn.execute("PRAGMA foreign_keys = ON;")

def has_embedding(id):
    return conn.execute("SELECT COUNT(1) FROM tags WHERE music_id=? AND key='embedding';", (id,)) == 1

names = []
ids = []

def vecToBlob(v):
    tot = bytearray()
    for val in v:
        ba = bytearray(struct.pack("f", val))
        tot.extend(ba)
    return tot

for tag in conn.execute("SELECT * FROM tags WHERE key='local_mp3';"):
    id = tag[0]
    value = tag[2]
    if has_embedding(id):
        continue
    names.append("storage/"+str(value))
    ids.append(id)
    break

for id, (taggram, labels, features) in zip(ids, extractor(names, model="MSD_musicnn")):
    vector = np.mean(features["penultimate"], axis=0)
    blob = vecToBlob(vector)

    conn.execute("INSERT INTO tags (music_id, key, vector) VALUES (?, 'embedding', ?);", (id, blob))
    print("inserted embedding for", id)

