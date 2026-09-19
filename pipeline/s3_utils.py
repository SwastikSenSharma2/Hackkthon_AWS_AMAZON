"""
pipeline/s3_utils.py
====================
Cloud Storage (AWS S3) and Local I/O Utility.

Fetches datasets directly into memory from AWS S3 using boto3 when S3 URIs
(s3://bucket/key) are configured, with seamless fallback to local files.
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import networkx as nx
import pandas as pd

log = logging.getLogger(__name__)

# Lazy singleton for boto3 S3 client
_S3_CLIENT = None


def get_s3_client():
    """Lazily instantiate and return a boto3 S3 client."""
    global _S3_CLIENT
    if _S3_CLIENT is None:
        try:
            import boto3
            from botocore.config import Config

            # Standard retries and timeout configuration
            boto_cfg = Config(retries={"max_attempts": 3, "mode": "standard"})
            _S3_CLIENT = boto3.client("s3", config=boto_cfg)
        except ImportError as exc:
            raise ImportError(
                "boto3 is required to fetch files from S3. "
                "Install it via: pip install boto3"
            ) from exc
    return _S3_CLIENT


def is_s3_uri(path_or_uri: str | Path) -> bool:
    """Check if the given path or URI is an S3 URI (s3://...)."""
    return str(path_or_uri).strip().startswith("s3://")


def parse_s3_uri(s3_uri: str) -> tuple[str, str]:
    """
    Parse an S3 URI into (bucket_name, object_key).
    Example: 's3://pune-aco-data-2026/pune_traffic_clean.csv' -> ('pune-aco-data-2026', 'pune_traffic_clean.csv')
    """
    parsed = urlparse(str(s3_uri).strip())
    if parsed.scheme != "s3" or not parsed.netloc:
        raise ValueError(f"Invalid S3 URI: {s3_uri}")
    bucket = parsed.netloc
    key = parsed.path.lstrip("/")
    return bucket, key


def load_bytes_from_path_or_s3(path_or_uri: str | Path, root_dir: Path | None = None) -> bytes:
    """
    Read raw bytes into memory from an S3 URI or a local file path.
    """
    path_str = str(path_or_uri).strip()
    if is_s3_uri(path_str):
        bucket, key = parse_s3_uri(path_str)
        log.info("Fetching bytes from AWS S3: s3://%s/%s …", bucket, key)
        client = get_s3_client()
        response = client.get_object(Bucket=bucket, Key=key)
        raw_bytes = response["Body"].read()
        log.info("Fetched %d bytes from S3 (s3://%s/%s).", len(raw_bytes), bucket, key)
        return raw_bytes

    # Local file path fallback
    local_path = Path(path_str)
    if not local_path.is_absolute() and root_dir is not None:
        local_path = root_dir / local_path
    log.info("Reading local file: %s …", local_path)
    with open(local_path, "rb") as fh:
        return fh.read()


def load_text_from_path_or_s3(
    path_or_uri: str | Path,
    root_dir: Path | None = None,
    encoding: str = "utf-8",
) -> str:
    """
    Read text content into memory from an S3 URI or a local file path.
    """
    raw_bytes = load_bytes_from_path_or_s3(path_or_uri, root_dir=root_dir)
    return raw_bytes.decode(encoding)


def load_json_from_path_or_s3(
    path_or_uri: str | Path,
    root_dir: Path | None = None,
    encoding: str = "utf-8",
) -> Any:
    """
    Load and parse a JSON object/list into memory from an S3 URI or local file.
    """
    text = load_text_from_path_or_s3(path_or_uri, root_dir=root_dir, encoding=encoding)
    return json.loads(text)


def load_csv_from_path_or_s3(
    path_or_uri: str | Path,
    root_dir: Path | None = None,
    **kwargs: Any,
) -> pd.DataFrame:
    """
    Load a CSV dataset into a pandas DataFrame directly from S3 (in-memory) or local file.
    """
    path_str = str(path_or_uri).strip()
    if is_s3_uri(path_str):
        raw_bytes = load_bytes_from_path_or_s3(path_str)
        return pd.read_csv(io.BytesIO(raw_bytes), **kwargs)

    local_path = Path(path_str)
    if not local_path.is_absolute() and root_dir is not None:
        local_path = root_dir / local_path
    return pd.read_csv(local_path, **kwargs)


def load_graphml_from_path_or_s3(
    path_or_uri: str | Path,
    root_dir: Path | None = None,
) -> nx.DiGraph:
    """
    Parse a GraphML XML road network directly from S3 (in-memory) or local file into a NetworkX DiGraph.
    """
    path_str = str(path_or_uri).strip()
    if is_s3_uri(path_str):
        raw_bytes = load_bytes_from_path_or_s3(path_str)
        # NetworkX can parse GraphML lines directly from an in-memory stream
        lines = [line.decode("utf-8") if isinstance(line, bytes) else line for line in io.BytesIO(raw_bytes)]
        G = nx.parse_graphml(lines)
        if not isinstance(G, nx.DiGraph):
            G = nx.DiGraph(G)
        return G

    local_path = Path(path_str)
    if not local_path.is_absolute() and root_dir is not None:
        local_path = root_dir / local_path
    G = nx.read_graphml(str(local_path))
    if not isinstance(G, nx.DiGraph):
        G = nx.DiGraph(G)
    return G
