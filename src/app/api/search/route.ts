import { NextResponse } from 'next/server';
import { getSettings } from '../../../lib/data';
import { getBookReaderPageUrls } from '../../../lib/bookReaderPages';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const settings = await getSettings();
    const recommendedBooks = settings.recommended_books || [];

    const visibleBooks = recommendedBooks.filter((b) => b.is_visible !== false);

    const searchData = {
      books: visibleBooks.map((b) => {
        const pages = getBookReaderPageUrls(b);
        return {
          id: b.id,
          title: b.title,
          author: b.author || 'Tủ Sách Y Khoa',
          description: b.description || '',
          cover_url: b.cover_url || '/documents/covers/cover_hieu_dung_ve_cot_song.png',
          badge_tag: b.badge_tag || b.tag || 'NÊN ĐỌC',
          pages_count: pages.length,
          pages: pages,
        };
      }),
    };

    return NextResponse.json(searchData);
  } catch (error) {
    console.error('Error in /api/search:', error);
    return NextResponse.json({ error: 'Failed to fetch books search index' }, { status: 500 });
  }
}
