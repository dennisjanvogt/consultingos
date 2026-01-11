#!/usr/bin/env python3
"""
Download Pokemon Official Artwork and import into Layer Library
"""

import os
import sys
import django
import requests
import base64
from io import BytesIO
from PIL import Image

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'consultingos.settings')
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
django.setup()

from apps.documents.models import LayerAsset
from django.contrib.auth import get_user_model

User = get_user_model()

# Get Pokemon names from PokeAPI
def get_pokemon_names(limit=151):
    """Fetch Pokemon names from PokeAPI"""
    url = f"https://pokeapi.co/api/v2/pokemon?limit={limit}"
    response = requests.get(url)
    data = response.json()

    pokemon = {}
    for i, p in enumerate(data['results'], 1):
        # Capitalize name properly
        name = p['name'].replace('-', ' ').title()
        pokemon[i] = name

    return pokemon

def download_pokemon_artwork(pokemon_id):
    """Download official artwork for a Pokemon"""
    url = f"https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/{pokemon_id}.png"

    try:
        response = requests.get(url, timeout=30)
        if response.status_code == 200:
            return response.content
    except Exception as e:
        print(f"  Error downloading Pokemon {pokemon_id}: {e}")

    return None

def create_thumbnail(image_data, size=(200, 200)):
    """Create a thumbnail from image data"""
    img = Image.open(BytesIO(image_data))

    # Convert to RGBA if needed
    if img.mode != 'RGBA':
        img = img.convert('RGBA')

    # Resize maintaining aspect ratio
    img.thumbnail(size, Image.Resampling.LANCZOS)

    # Create new image with transparent background
    thumb = Image.new('RGBA', size, (0, 0, 0, 0))

    # Center the thumbnail
    offset = ((size[0] - img.width) // 2, (size[1] - img.height) // 2)
    thumb.paste(img, offset, img)

    # Save to bytes
    buffer = BytesIO()
    thumb.save(buffer, format='PNG', optimize=True)
    return buffer.getvalue()

def image_to_base64(image_data):
    """Convert image bytes to base64 data URL"""
    b64 = base64.b64encode(image_data).decode('utf-8')
    return f"data:image/png;base64,{b64}"

def main():
    print("=" * 60)
    print("Pokemon Official Artwork Importer")
    print("=" * 60)

    # Get admin user (staff or superuser)
    admin_user = User.objects.filter(is_staff=True).first()
    if not admin_user:
        admin_user = User.objects.first()
    if not admin_user:
        print("ERROR: No user found!")
        return
    print(f"Using user: {admin_user.username}")

    # Get Pokemon names
    print("\nFetching Pokemon names from PokeAPI...")
    pokemon_names = get_pokemon_names(151)  # Gen 1
    print(f"Got {len(pokemon_names)} Pokemon names")

    # Check existing assets
    existing = set(LayerAsset.objects.filter(category__startswith='Pokemon').values_list('name', flat=True))
    print(f"Already have {len(existing)} Pokemon in library")

    imported = 0
    skipped = 0
    failed = 0

    for pokemon_id, name in pokemon_names.items():
        pokemon_name = f"Pokemon #{pokemon_id:03d} {name}"

        if pokemon_name in existing or name in existing:
            print(f"  Skipping {name} (already exists)")
            skipped += 1
            continue

        print(f"  Downloading {name}...", end=" ", flush=True)

        # Download artwork
        image_data = download_pokemon_artwork(pokemon_id)
        if not image_data:
            print("FAILED")
            failed += 1
            continue

        # Get dimensions
        img = Image.open(BytesIO(image_data))
        width, height = img.size

        # Create thumbnail
        thumbnail_data = create_thumbnail(image_data)

        # Convert to base64
        image_b64 = image_to_base64(image_data)
        thumbnail_b64 = image_to_base64(thumbnail_data)

        # Determine category based on Pokemon type/generation
        # Gen 1 Pokemon (1-151)
        category = "Pokemon/Gen 1"

        # Create asset
        LayerAsset.objects.create(
            user=admin_user,
            name=name,
            image_data=image_b64,
            thumbnail=thumbnail_b64,
            width=width,
            height=height,
            category=category
        )

        print(f"OK ({width}x{height})")
        imported += 1

    print("\n" + "=" * 60)
    print(f"Import complete!")
    print(f"  Imported: {imported}")
    print(f"  Skipped:  {skipped}")
    print(f"  Failed:   {failed}")
    print("=" * 60)

if __name__ == '__main__':
    main()
