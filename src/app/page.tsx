export const runtime = 'edge';
export const dynamic = 'force-dynamic';

import FamilyTree from '@/components/FamilyTree';
import { getDB } from '@/lib/db';

interface Person {
  id: string;
  full_name: string;
  parent_id: string | null;
  tooltip: string;
  image_url: string;
}

interface Spouse {
  id: string;
  full_name: string;
  person_id: string;
  image_url: string;
}

interface Link {
  id: number;
  person_id: string;
  url: string;
  description: string;
  display_html: string;
}

interface Gallery {
  id: number;
  description: string;
  gdrive_link: string;
  display_order: number;
}

interface TreeData {
  people: Person[];
  spouses: Spouse[];
  links: Link[];
  galleries: Gallery[];
}

async function getTreeData(): Promise<TreeData | null> {
  try {
    const db = getDB();
    const [peopleRes, spousesRes, linksRes, galleriesRes] = await Promise.all([
      db.prepare("SELECT id, full_name, parent_id, tooltip, image_url FROM people WHERE status = 'approved' ORDER BY created_at ASC").all(),
      db.prepare('SELECT id, full_name, person_id, image_url FROM spouses ORDER BY id ASC').all(),
      db.prepare('SELECT id, person_id, url, description, display_html FROM links ORDER BY id ASC').all(),
      db.prepare('SELECT id, description, gdrive_link, display_order FROM galleries ORDER BY display_order ASC, id ASC').all(),
    ]);
    return {
      people: peopleRes.results as unknown as Person[],
      spouses: spousesRes.results as unknown as Spouse[],
      links: linksRes.results as unknown as Link[],
      galleries: galleriesRes.results as unknown as Gallery[],
    };
  } catch {
    return null;
  }
}

export default async function HomePage() {
  const data = await getTreeData();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-tan-800 mb-1">Our Family Tree</h1>
        <p className="text-tan-600 text-sm">
          Click any node to expand / collapse branches. Use the Submit page to
          add new members or links.
        </p>
      </div>

      {data ? (
        <>
          <FamilyTree
            people={data.people}
            spouses={data.spouses}
            links={data.links}
          />

          {data.galleries.length > 0 && (
            <section className="mt-12">
              <h2 className="text-2xl font-bold text-tan-800 mb-4">Photo Galleries</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {data.galleries.map((g) => (
                  <a
                    key={g.id}
                    href={g.gdrive_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block bg-white border border-tan-200 rounded-lg p-4 hover:border-tan-400 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">📁</span>
                      <div>
                        <p className="font-medium text-tan-800 group-hover:text-tan-600 transition-colors">
                          {g.description}
                        </p>
                        <p className="text-xs text-tan-500 mt-0.5">Google Drive folder</p>
                      </div>
                    </div>
                  </a>
                ))}
              </div>
            </section>
          )}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-tan-600">
          <span className="text-5xl mb-4">🌳</span>
          <p className="text-lg font-medium">Could not load family tree data.</p>
          <p className="text-sm mt-2">
            Make sure the database is set up and the API is reachable.
          </p>
        </div>
      )}
    </div>
  );
}
