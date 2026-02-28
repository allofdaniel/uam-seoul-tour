import { NextRequest, NextResponse } from 'next/server';

const GOOGLE_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_TILES_API_KEY || '';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const lat = searchParams.get('lat');
  const lng = searchParams.get('lng');
  const name = searchParams.get('name');

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Missing lat/lng' }, { status: 400 });
  }

  if (!GOOGLE_API_KEY) {
    return NextResponse.json({ error: 'No API key' }, { status: 500 });
  }

  try {
    // Google Places API (New) - searchNearby
    const searchBody: any = {
      includedTypes: ['tourist_attraction', 'point_of_interest'],
      locationRestriction: {
        circle: {
          center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
          radius: 500,
        },
      },
      maxResultCount: 5,
    };

    let photoName: string | null = null;

    // 1. 먼저 이름으로 텍스트 검색
    if (name) {
      const textRes = await fetch('https://places.googleapis.com/v1/places:searchText', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.photos,places.displayName',
        },
        body: JSON.stringify({
          textQuery: name,
          includedType: 'tourist_attraction',
          locationBias: {
            circle: {
              center: { latitude: parseFloat(lat), longitude: parseFloat(lng) },
              radius: 1000,
            },
          },
          maxResultCount: 3,
        }),
      });

      if (textRes.ok) {
        const textData = await textRes.json();
        const places = textData.places || [];
        for (const place of places) {
          if (place.photos && place.photos.length > 0) {
            photoName = place.photos[0].name;
            break;
          }
        }
      }
    }

    // 2. 텍스트 검색 실패시 주변 검색
    if (!photoName) {
      const nearbyRes = await fetch('https://places.googleapis.com/v1/places:searchNearby', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': GOOGLE_API_KEY,
          'X-Goog-FieldMask': 'places.photos,places.displayName',
        },
        body: JSON.stringify(searchBody),
      });

      if (nearbyRes.ok) {
        const nearbyData = await nearbyRes.json();
        const places = nearbyData.places || [];
        for (const place of places) {
          if (place.photos && place.photos.length > 0) {
            photoName = place.photos[0].name;
            break;
          }
        }
      }
    }

    if (!photoName) {
      return NextResponse.json({ photoUrl: null });
    }

    // 3. 사진 URL 가져오기
    const photoRes = await fetch(
      `https://places.googleapis.com/v1/${photoName}/media?maxHeightPx=800&key=${GOOGLE_API_KEY}&skipHttpRedirect=true`
    );

    if (!photoRes.ok) {
      return NextResponse.json({ photoUrl: null });
    }

    const photoData = await photoRes.json();
    return NextResponse.json({ photoUrl: photoData.photoUri || null });
  } catch (error) {
    console.error('Places API error:', error);
    return NextResponse.json({ photoUrl: null });
  }
}
