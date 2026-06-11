#!/usr/bin/env python3
"""
TurboVec Worker - Vector database operations for document chunks.

This script provides a simple vector database implementation that supports:
- Storing document chunks as vectors with metadata
- Searching for similar vectors using cosine similarity
- Filtering results based on metadata

The worker reads JSON payloads from stdin and outputs JSON responses.
"""

import hashlib
import json
import math
import os
import sys
import tempfile
from contextlib import contextmanager

try:
    import fcntl
except ImportError:
    fcntl = None

# Path to the vector store JSON file
STORE_PATH = os.environ.get(
    "VECTOR_STORE_PATH",
    os.path.join(os.path.dirname(__file__), "..", "data", "vector_store.json")
)
LOCK_PATH = f"{STORE_PATH}.lock"


@contextmanager
def store_lock():
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)

    with open(LOCK_PATH, "w", encoding="utf-8") as lock_file:
        if fcntl:
            fcntl.flock(lock_file.fileno(), fcntl.LOCK_EX)

        try:
            yield
        finally:
            if fcntl:
                fcntl.flock(lock_file.fileno(), fcntl.LOCK_UN)


def vector_key(seed):
    """
    Generate a unique vector key from a seed string.

    Args:
        seed: A string used to generate the key (e.g., documentId:chunkIndex:content)

    Returns:
        A 15-character hexadecimal string derived from SHA-256 hash
    """
    digest = hashlib.sha256(seed.encode("utf-8")).hexdigest()
    return digest[:15]


def load_store():
    """
    Load the vector store from disk.

    Returns:
        List of vector items if file exists, empty list otherwise

    The vector store is stored as JSON with the following structure:
    [
        {
            "vectorKey": "unique_key",
            "vector": [float1, float2, ...],
            "metadata": {key: value, ...}
        },
        ...
    ]
    """
    if not os.path.exists(STORE_PATH):
        return []

    try:
        with open(STORE_PATH, "r", encoding="utf-8") as store_file:
            return json.load(store_file)
    except json.JSONDecodeError as error:
        raise ValueError(f"Vector store is corrupt at byte {error.pos}. Rebuild or repair {STORE_PATH}.") from error


def save_store(items):
    """
    Save the vector store to disk.

    Args:
        items: List of vector items to save
    """
    os.makedirs(os.path.dirname(STORE_PATH), exist_ok=True)

    with tempfile.NamedTemporaryFile(
        "w",
        encoding="utf-8",
        dir=os.path.dirname(STORE_PATH),
        delete=False
    ) as store_file:
        temp_path = store_file.name
        json.dump(items, store_file)
        store_file.flush()
        os.fsync(store_file.fileno())

    os.replace(temp_path, STORE_PATH)


def cosine(left, right):
    """
    Calculate cosine similarity between two vectors.

    Args:
        left: First vector as list of floats
        right: Second vector as list of floats

    Returns:
        Cosine similarity score (float between -1 and 1)

    The cosine similarity measures the angle between two vectors.
    A score of 1 means identical direction, 0 means orthogonal,
    and -1 means opposite direction.
    """
    dot = sum(a * b for a, b in zip(left, right))
    left_mag = math.sqrt(sum(value * value for value in left)) or 1
    right_mag = math.sqrt(sum(value * value for value in right)) or 1
    return dot / (left_mag * right_mag)


def matches_filter(metadata, filter_payload):
    """
    Check if metadata matches the filter criteria.

    Args:
        metadata: Document chunk metadata dictionary
        filter_payload: Filter criteria to apply

    Returns:
        True if all filter criteria are satisfied, False otherwise

    Example:
        metadata = {"source": "pdf", "date": "2023-01-01"}
        filter_payload = {"source": "pdf"}
        # Returns True
    """
    for key, expected in filter_payload.items():
        if metadata.get(key) != expected:
            return False

    return True


def upsert(payload):
    """
    Insert or update document chunks in the vector store.

    Args:
        payload: Dictionary containing:
            - documentId: Unique identifier for the document
            - chunks: List of chunk objects with:
                * chunkIndex: Index of the chunk within the document
                * content: Text content of the chunk
                * vector: Embedding vector for the content
                * metadata: Additional metadata (source, date, etc.)

    Returns:
        Dictionary containing the list of generated vector keys

    This operation removes any existing chunks with matching keys before inserting new ones.
    """
    with store_lock():
        chunks = payload.get("chunks", [])
        store = load_store()
        next_items = []
        keys = [
            chunk.get("vectorKey") or vector_key(f"{payload.get('documentId')}:{chunk.get('chunkIndex')}:{chunk.get('content')}")
            for chunk in chunks
        ]

        stale_keys = set(keys)
        store = [item for item in store if item.get("vectorKey") not in stale_keys]

        for index, chunk in enumerate(chunks):
            next_items.append({
                "vectorKey": keys[index],
                "vector": chunk.get("vector", []),
                "metadata": chunk.get("metadata", {})
            })

        save_store(store + next_items)
        return {"vectorKeys": keys}


def search(payload):
    """
    Search for similar vectors in the store.

    Args:
        payload: Dictionary containing:
            - topK: Maximum number of results to return (default: 5)
            - vector: Query vector to search for
            - filter: Metadata filter criteria

    Returns:
        Dictionary containing list of matches with:
            * vectorKey: Unique identifier of the matched vector
            * score: Cosine similarity score

    Results are sorted by similarity score in descending order.
    """
    top_k = int(payload.get("topK", 5))
    query_vector = payload.get("vector", [])
    filter_payload = payload.get("filter", {})
    store = load_store()

    matches = [
        {
            "vectorKey": item.get("vectorKey"),
            "score": round(cosine(query_vector, item.get("vector", [])), 4)
        }
        for item in store
        if matches_filter(item.get("metadata", {}), filter_payload)
    ]

    matches.sort(key=lambda match: match["score"], reverse=True)

    return {"matches": matches[:top_k]}


def main():
    """
    Main entry point that processes incoming requests.

    Reads JSON payload from stdin, executes the requested operation,
    and prints the result as JSON to stdout.
    """
    payload = json.load(sys.stdin)
    operation = payload.get("operation")

    if operation == "upsert":
        print(json.dumps(upsert(payload)))
        return

    if operation == "search":
        print(json.dumps(search(payload)))
        return

    raise ValueError(f"Unknown operation: {operation}")


if __name__ == "__main__":
    """
    Execution guard that runs the main function when script is executed directly.

    Catches any exceptions and prints them to stderr before exiting with error code 1.
    """
    try:
        main()
    except Exception as error:
        print(str(error), file=sys.stderr)
        sys.exit(1)
