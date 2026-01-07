"""
Text extraction from PDF and TXT files
"""
import os
import logging

logger = logging.getLogger(__name__)


def extract_text_from_pdf(file_path: str) -> tuple[str, int]:
    """
    Extract text from a PDF file using PyMuPDF
    Returns (text, page_count)
    """
    try:
        import fitz  # PyMuPDF
    except ImportError:
        logger.error("PyMuPDF not installed. Run: pip install PyMuPDF")
        raise ImportError("PyMuPDF is required for PDF extraction")

    text_parts = []
    page_count = 0

    try:
        doc = fitz.open(file_path)
        page_count = len(doc)

        for page_num, page in enumerate(doc):
            text = page.get_text()
            if text.strip():
                # Add page marker for later reference
                text_parts.append(f"[Seite {page_num + 1}]\n{text}")

        doc.close()
        return '\n\n'.join(text_parts), page_count

    except Exception as e:
        logger.error(f"Error extracting text from PDF: {e}")
        raise


def extract_text_from_txt(file_path: str) -> tuple[str, int]:
    """
    Extract text from a TXT file
    Returns (text, page_count=1)
    """
    try:
        # Try different encodings
        encodings = ['utf-8', 'latin-1', 'cp1252']

        for encoding in encodings:
            try:
                with open(file_path, 'r', encoding=encoding) as f:
                    text = f.read()
                return text, 1
            except UnicodeDecodeError:
                continue

        raise ValueError("Could not decode file with any known encoding")

    except Exception as e:
        logger.error(f"Error extracting text from TXT: {e}")
        raise


def extract_text(file_path: str, file_type: str) -> tuple[str, int]:
    """
    Extract text from a file based on its type
    Returns (text, page_count)
    """
    file_type = file_type.lower().lstrip('.')

    if file_type == 'pdf':
        return extract_text_from_pdf(file_path)
    elif file_type == 'txt':
        return extract_text_from_txt(file_path)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")
