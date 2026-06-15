"""Logging configuration for toolglass."""

import logging
import sys

# Module-level logger
logger = logging.getLogger("toolglass")


def setup_logging(verbose: bool = False) -> None:
    """Configure toolglass logging.

    Args:
        verbose: If True, set level to DEBUG. Otherwise INFO.
    """
    level = logging.DEBUG if verbose else logging.INFO

    handler = logging.StreamHandler(sys.stderr)
    handler.setFormatter(
        logging.Formatter(
            "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
            datefmt="%H:%M:%S",
        ),
    )

    logger.setLevel(level)
    logger.handlers.clear()
    logger.addHandler(handler)
    logger.propagate = False
