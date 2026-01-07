"""
Semantic text chunking with variable chunk sizes.
Chunks respect natural content boundaries (sections, paragraphs, lists).
Size varies based on content - no artificial splits.
"""
import re
import logging
from typing import List, Dict, Optional

logger = logging.getLogger(__name__)

# Only hard limits - natural boundaries determine actual size
MIN_CHUNK_SIZE = 50    # Merge chunks smaller than this
MAX_CHUNK_SIZE = 4000  # Only force-split if exceeding this


def extract_page_number(text: str) -> Optional[int]:
    """Extract page number from text if present"""
    match = re.search(r'\[Seite (\d+)\]', text)
    if match:
        return int(match.group(1))
    return None


def is_heading(line: str) -> bool:
    """Check if a line is likely a heading"""
    line = line.strip()
    if not line or len(line) > 200:
        return False

    # Markdown headings
    if re.match(r'^#{1,6}\s+.+$', line):
        return True
    # Numbered sections: "1. Title", "1.2 Title", "1.2.3 Title"
    if re.match(r'^\d+(\.\d+)*\.?\s+[A-ZÄÖÜ]', line):
        return True
    # ALL CAPS lines (likely titles)
    if line.isupper() and 3 < len(line) < 80:
        return True
    # Title Case ending with colon
    if re.match(r'^[A-ZÄÖÜ][A-ZÄÖÜa-zäöüß\s]{2,60}:$', line):
        return True
    # Short line that looks like a title (Title Case, no punctuation at end)
    if len(line) < 80 and line[0].isupper() and not line[-1] in '.!?,;:':
        words = line.split()
        if 1 <= len(words) <= 8:
            # Most words start with uppercase or are short
            title_words = sum(1 for w in words if w[0].isupper() or len(w) <= 3)
            if title_words >= len(words) * 0.6:
                return True

    return False


def is_list_start(line: str) -> bool:
    """Check if line starts a list item"""
    line = line.strip()
    return bool(
        re.match(r'^[\-\*•]\s+', line) or
        re.match(r'^\d+[\.)\]]\s+', line) or
        re.match(r'^[a-z][\.)\]]\s+', line)
    )


def is_code_block_marker(line: str) -> bool:
    """Check if line is a code block delimiter"""
    return line.strip().startswith('```')


def split_into_semantic_units(text: str) -> List[Dict]:
    """
    Split text into semantic units based on natural boundaries.
    Each unit is a cohesive piece of content (section, paragraph, list, code block).
    """
    units = []
    lines = text.split('\n')

    current_unit = {'type': 'paragraph', 'content': [], 'has_heading': False}
    in_code_block = False
    consecutive_empty = 0

    for line in lines:
        stripped = line.strip()

        # Handle code blocks - keep together
        if is_code_block_marker(line):
            if in_code_block:
                # End of code block
                current_unit['content'].append(line)
                in_code_block = False
                continue
            else:
                # Start of code block - save previous and start code unit
                if current_unit['content']:
                    units.append(current_unit)
                current_unit = {'type': 'code', 'content': [line], 'has_heading': False}
                in_code_block = True
                continue

        if in_code_block:
            current_unit['content'].append(line)
            continue

        # Empty lines - track for paragraph boundaries
        if not stripped:
            consecutive_empty += 1
            if consecutive_empty >= 2 and current_unit['content']:
                # Double empty line = strong boundary
                units.append(current_unit)
                current_unit = {'type': 'paragraph', 'content': [], 'has_heading': False}
            continue

        consecutive_empty = 0

        # Heading - starts new section
        if is_heading(stripped):
            # Save previous unit if it has content
            if current_unit['content']:
                units.append(current_unit)
            # Start new section with this heading
            current_unit = {'type': 'section', 'content': [line], 'has_heading': True}
            continue

        # List item
        if is_list_start(stripped):
            # If we're not already in a list, check if we should start one
            if current_unit['type'] != 'list' and not current_unit['has_heading']:
                if current_unit['content']:
                    units.append(current_unit)
                current_unit = {'type': 'list', 'content': [line], 'has_heading': False}
            else:
                current_unit['content'].append(line)
            continue

        # Regular content line
        # Check if we're transitioning from list to paragraph
        if current_unit['type'] == 'list' and not is_list_start(stripped):
            # Non-list line after list - could be continuation or new paragraph
            # If it's indented, probably continuation
            if line.startswith('  ') or line.startswith('\t'):
                current_unit['content'].append(line)
            else:
                # New paragraph
                units.append(current_unit)
                current_unit = {'type': 'paragraph', 'content': [line], 'has_heading': False}
            continue

        current_unit['content'].append(line)

    # Don't forget last unit
    if current_unit['content']:
        units.append(current_unit)

    return units


def merge_small_units(units: List[Dict]) -> List[Dict]:
    """Merge units that are too small to stand alone"""
    if not units:
        return []

    merged = []
    buffer = None

    for unit in units:
        content_text = '\n'.join(unit['content'])
        content_len = len(content_text)

        if buffer is None:
            if content_len < MIN_CHUNK_SIZE and not unit['has_heading']:
                # Too small, buffer it
                buffer = unit
            else:
                merged.append(unit)
        else:
            # We have buffered content
            buffer_text = '\n'.join(buffer['content'])
            combined_len = len(buffer_text) + len(content_text) + 2

            if combined_len < MAX_CHUNK_SIZE:
                # Merge buffer with current
                buffer['content'].extend(['', *unit['content']])
                buffer['type'] = unit['type'] if unit['has_heading'] else buffer['type']
                buffer['has_heading'] = buffer['has_heading'] or unit['has_heading']

                if len('\n'.join(buffer['content'])) >= MIN_CHUNK_SIZE:
                    merged.append(buffer)
                    buffer = None
            else:
                # Can't merge, output buffer and start fresh
                merged.append(buffer)
                if content_len < MIN_CHUNK_SIZE and not unit['has_heading']:
                    buffer = unit
                else:
                    merged.append(unit)
                    buffer = None

    if buffer:
        # Append remaining buffer to last unit or as new unit
        if merged and len('\n'.join(merged[-1]['content'])) + len('\n'.join(buffer['content'])) < MAX_CHUNK_SIZE:
            merged[-1]['content'].extend(['', *buffer['content']])
        else:
            merged.append(buffer)

    return merged


def split_oversized_unit(unit: Dict) -> List[Dict]:
    """Split a unit that exceeds MAX_CHUNK_SIZE at natural boundaries"""
    content = '\n'.join(unit['content'])

    if len(content) <= MAX_CHUNK_SIZE:
        return [unit]

    results = []

    # Try splitting by paragraphs first
    paragraphs = re.split(r'\n\s*\n', content)

    current_chunk = []
    current_len = 0

    for para in paragraphs:
        para = para.strip()
        if not para:
            continue

        para_len = len(para)

        if current_len + para_len + 2 <= MAX_CHUNK_SIZE:
            current_chunk.append(para)
            current_len += para_len + 2
        else:
            # Save current chunk
            if current_chunk:
                results.append({
                    'type': unit['type'],
                    'content': ['\n\n'.join(current_chunk)],
                    'has_heading': unit['has_heading'] and len(results) == 0
                })

            # Handle paragraph that's itself too large
            if para_len > MAX_CHUNK_SIZE:
                # Split by sentences
                sentences = re.split(r'(?<=[.!?])\s+', para)
                sent_chunk = []
                sent_len = 0

                for sent in sentences:
                    if sent_len + len(sent) + 1 <= MAX_CHUNK_SIZE:
                        sent_chunk.append(sent)
                        sent_len += len(sent) + 1
                    else:
                        if sent_chunk:
                            results.append({
                                'type': 'paragraph',
                                'content': [' '.join(sent_chunk)],
                                'has_heading': False
                            })
                        sent_chunk = [sent] if len(sent) <= MAX_CHUNK_SIZE else [sent[:MAX_CHUNK_SIZE]]
                        sent_len = len(sent_chunk[0])

                if sent_chunk:
                    current_chunk = [' '.join(sent_chunk)]
                    current_len = len(current_chunk[0])
                else:
                    current_chunk = []
                    current_len = 0
            else:
                current_chunk = [para]
                current_len = para_len

    if current_chunk:
        results.append({
            'type': unit['type'],
            'content': ['\n\n'.join(current_chunk)],
            'has_heading': False
        })

    return results


def chunk_document(text: str) -> List[Dict]:
    """
    Main entry point for semantic chunking.

    Splits text into variable-sized chunks based on natural content boundaries.
    Chunk sizes vary - a short section stays short, a long paragraph stays together
    (unless it exceeds the hard limit).

    Args:
        text: The full document text

    Returns:
        List of chunk dicts with 'content' and 'page_number'
    """
    if not text or not text.strip():
        return []

    # Step 1: Split into semantic units
    units = split_into_semantic_units(text)
    logger.info(f"Found {len(units)} semantic units")

    # Step 2: Merge small units
    units = merge_small_units(units)
    logger.info(f"After merging: {len(units)} units")

    # Step 3: Split oversized units
    final_units = []
    for unit in units:
        final_units.extend(split_oversized_unit(unit))
    logger.info(f"After splitting oversized: {len(final_units)} units")

    # Step 4: Create output chunks with page numbers
    chunks = []
    for unit in final_units:
        content = '\n'.join(unit['content']).strip()
        if not content:
            continue

        page_number = extract_page_number(content)
        clean_content = re.sub(r'\[Seite \d+\]\s*', '', content).strip()

        if clean_content:
            chunks.append({
                'content': clean_content,
                'page_number': page_number
            })

    # Log chunk size distribution
    sizes = [len(c['content']) for c in chunks]
    if sizes:
        logger.info(f"Chunk sizes - min: {min(sizes)}, max: {max(sizes)}, avg: {sum(sizes)//len(sizes)}")

    logger.info(f"Created {len(chunks)} variable-sized chunks")
    return chunks
