import fs from "fs";
import path from "path";
import { marked } from "marked";

type SpecFile = {
  slug: string;
  filename: string;
  title: string;
  html: string;
};

function getSpecs(): SpecFile[] {
  const specsDir = path.join(process.cwd(), "specs");
  const files = fs.readdirSync(specsDir).filter((f) => f.endsWith(".md") && f !== "README.md");

  // Sort: overview first, then by WH number
  files.sort((a, b) => {
    if (a === "v1-overview.md") return -1;
    if (b === "v1-overview.md") return 1;
    return a.localeCompare(b);
  });

  return files.map((filename) => {
    const content = fs.readFileSync(path.join(specsDir, filename), "utf-8");
    const slug = filename.replace(".md", "");

    // Extract title from first h1
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch ? titleMatch[1] : slug;

    // Custom renderer
    const renderer = new marked.Renderer();

    renderer.listitem = function ({ text, task }) {
      if (task !== undefined) {
        const checked = task ? "done" : "empty";
        // Strip the default checkbox that marked inserts
        const cleanText = text.replace(/<input.*?type="checkbox".*?>/i, "").trim();
        return `<div class="criterion"><div class="check ${checked}"></div><span>${cleanText}</span></div>`;
      }
      return `<li>${text}</li>`;
    };

    renderer.list = function ({ body, ordered }) {
      // If body contains criterion divs, don't wrap in ul/ol
      if (body.includes('class="criterion"')) {
        return `<div class="criteria-list">${body}</div>`;
      }
      const tag = ordered ? "ol" : "ul";
      return `<${tag}>${body}</${tag}>`;
    };

    renderer.blockquote = function ({ text }) {
      return `<div class="open-q"><div class="open-q-label">Open question</div>${text}</div>`;
    };

    renderer.code = function ({ text }) {
      return `<pre class="code-block"><code>${text}</code></pre>`;
    };

    const html = marked(content, { renderer }) as string;
    return { slug, filename, title, html };
  });
}

export const dynamic = "force-static";

export default function SpecsPage() {
  const specs = getSpecs();

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,400;14..32,450;14..32,500;14..32,600;14..32,700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
          * { margin: 0; padding: 0; box-sizing: border-box; }
          :root {
            --bg: #f8f7f4; --surface: #ffffff; --sidebar-bg: #f1efeb;
            --hover: #edeae5; --inset: #e8e5df;
            --border: #dfdcd5; --border-light: #eae7e1;
            --text: #1c1917; --text-2: #57534e; --text-3: #a8a29e; --text-4: #d1cdc6;
            --accent: #c2410c; --green: #16a34a; --amber: #b45309; --blue: #2563eb;
            --shadow: 0 1px 3px rgba(28,25,23,0.04);
          }
          body {
            font-family: 'Inter', -apple-system, sans-serif;
            background: var(--bg); color: var(--text);
            font-size: 14px; line-height: 1.5; height: 100vh;
            display: flex; overflow: hidden; -webkit-font-smoothing: antialiased;
          }
          .sidebar {
            width: 216px; background: var(--sidebar-bg);
            border-right: 1px solid var(--border-light);
            display: flex; flex-direction: column; flex-shrink: 0;
          }
          .sidebar-header { padding: 20px 16px 24px; display: flex; align-items: center; gap: 10px; }
          .logo {
            width: 26px; height: 26px; background: var(--accent); border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 13px; color: white;
          }
          .logo-text { font-weight: 700; font-size: 15px; letter-spacing: -0.03em; }
          .sidebar-nav { padding: 0 8px; flex: 1; overflow-y: auto; }
          .nav-label {
            padding: 20px 8px 6px; font-size: 11px; font-weight: 600;
            color: var(--text-3); text-transform: uppercase; letter-spacing: 0.06em;
          }
          .spec-nav {
            padding: 5px 8px; border-radius: 6px;
            font-size: 12px; color: var(--text-3); cursor: pointer;
            display: flex; align-items: center; gap: 6px;
            transition: all 0.1s;
          }
          .spec-nav:hover { background: var(--hover); color: var(--text-2); }
          .spec-nav.active { color: var(--accent); font-weight: 500; }
          .sidebar-footer {
            padding: 14px 16px; border-top: 1px solid var(--border-light);
            font-size: 12px; color: var(--text-2);
            display: flex; align-items: center; gap: 8px;
          }
          .avatar {
            width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 600;
          }
          .main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .topbar {
            padding: 0 24px; height: 52px;
            display: flex; align-items: center;
            border-bottom: 1px solid var(--border-light);
            background: var(--surface); flex-shrink: 0;
          }
          .topbar h1 { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; }
          .content { flex: 1; overflow-y: auto; display: flex; justify-content: center; }
          .doc {
            width: 100%; max-width: 720px; padding: 48px 40px 120px; display: none;
          }
          .doc.active { display: block; }
          .doc h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 8px; }
          .doc h2 {
            font-size: 16px; font-weight: 600; letter-spacing: -0.01em;
            margin: 32px 0 12px; padding-bottom: 6px;
            border-bottom: 1px solid var(--border-light);
          }
          .doc h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
          .doc p { font-size: 14px; color: var(--text-2); line-height: 1.75; margin-bottom: 12px; }
          .doc strong { color: var(--text); font-weight: 600; }
          .doc ul, .doc ol { padding-left: 24px; margin: 0 0 16px; color: var(--text-2); }
          .doc li { margin-bottom: 6px; line-height: 1.6; }
          .doc code {
            font-size: 12px; background: var(--inset); padding: 1px 5px;
            border-radius: 3px; font-family: ui-monospace, monospace;
          }
          .code-block {
            background: var(--inset); padding: 14px 16px; border-radius: 8px;
            margin: 12px 0; overflow-x: auto; font-size: 13px;
            font-family: ui-monospace, monospace; line-height: 1.6; color: var(--text-2);
          }
          .code-block code { background: none; padding: 0; font-size: inherit; }
          .criterion {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 5px 0; font-size: 14px; color: var(--text-2); line-height: 1.6;
          }
          .check {
            width: 16px; height: 16px; border-radius: 4px;
            border: 1.5px solid var(--border); flex-shrink: 0; margin-top: 3px;
            display: flex; align-items: center; justify-content: center;
          }
          .check.done { background: var(--green); border-color: var(--green); }
          .check.done::after { content: '✓'; color: white; font-size: 10px; font-weight: 700; }
          .criteria-list { margin-bottom: 16px; }
          .open-q {
            background: rgba(180,83,9,0.06); border-radius: 8px;
            padding: 14px 16px; margin: 16px 0;
          }
          .open-q-label {
            font-size: 11px; font-weight: 600; color: var(--amber);
            text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 8px;
          }
          .open-q p { font-size: 13px; color: var(--text-2); line-height: 1.6; margin-bottom: 6px; }
          .open-q p:last-child { margin-bottom: 0; }
          ::-webkit-scrollbar { width: 5px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: var(--border-light); border-radius: 3px; }
        `,
          }}
        />
      </head>
      <body>
        <div className="sidebar">
          <div className="sidebar-header">
            <div className="logo">W</div>
            <div className="logo-text">Workhorse</div>
          </div>
          <div className="sidebar-nav">
            <div className="nav-label">v1 Specs</div>
            {specs.map((spec, i) => (
              <div
                key={spec.slug}
                className={`spec-nav${i === 0 ? " active" : ""}`}
                data-target={spec.slug}
              >
                {spec.title}
              </div>
            ))}
          </div>
          <div className="sidebar-footer">
            <div className="avatar">E</div>
            Edwin M-F
          </div>
        </div>

        <div className="main">
          <div className="topbar">
            <h1>v1 Specs — Review</h1>
          </div>
          <div className="content">
            {specs.map((spec, i) => (
              <div
                key={spec.slug}
                id={spec.slug}
                className={`doc${i === 0 ? " active" : ""}`}
                dangerouslySetInnerHTML={{ __html: spec.html }}
              />
            ))}
          </div>
        </div>

        <script
          dangerouslySetInnerHTML={{
            __html: `
          document.querySelectorAll('.spec-nav').forEach(nav => {
            nav.addEventListener('click', () => {
              document.querySelectorAll('.doc').forEach(d => d.classList.remove('active'));
              document.querySelectorAll('.spec-nav').forEach(n => n.classList.remove('active'));
              const target = nav.getAttribute('data-target');
              document.getElementById(target).classList.add('active');
              nav.classList.add('active');
            });
          });
        `,
          }}
        />
      </body>
    </html>
  );
}
