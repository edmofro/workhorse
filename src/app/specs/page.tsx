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

    renderer.list = function (token) {
      let body = "";
      for (const item of token.items) {
        body += this.listitem(item);
      }
      // If body contains criterion divs, don't wrap in ul/ol
      if (body.includes('class="criterion"')) {
        return `<div class="criteria-list">${body}</div>`;
      }
      const tag = token.ordered ? "ol" : "ul";
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
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
          /* Layout */
          .specs-layout {
            display: flex; height: 100vh; overflow: hidden;
          }
          .specs-sidebar {
            width: 216px; background: var(--bg-sidebar);
            border-right: 1px solid var(--border-subtle);
            display: flex; flex-direction: column; flex-shrink: 0;
          }
          .specs-sidebar-header { padding: 20px 16px 24px; display: flex; align-items: center; gap: 10px; }
          .specs-logo {
            width: 26px; height: 26px; background: var(--accent); border-radius: 6px;
            display: flex; align-items: center; justify-content: center;
            font-weight: 700; font-size: 13px; color: white;
          }
          .specs-logo-text { font-weight: 700; font-size: 15px; letter-spacing: -0.03em; }
          .specs-sidebar-nav { padding: 0 8px; flex: 1; overflow-y: auto; }
          .specs-nav-label {
            padding: 20px 8px 6px; font-size: 11px; font-weight: 600;
            color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.06em;
          }
          .spec-nav {
            padding: 5px 8px; border-radius: 6px;
            font-size: 12px; color: var(--text-muted); cursor: pointer;
            display: flex; align-items: center; gap: 6px;
            transition: all 0.1s;
          }
          .spec-nav:hover { background: var(--bg-hover); color: var(--text-secondary); }
          .spec-nav.active { color: var(--accent); font-weight: 500; }
          .specs-sidebar-footer {
            padding: 14px 16px; border-top: 1px solid var(--border-subtle);
            font-size: 12px; color: var(--text-secondary);
            display: flex; align-items: center; gap: 8px;
          }
          .specs-avatar {
            width: 22px; height: 22px; border-radius: 50%; background: var(--accent); color: white;
            display: flex; align-items: center; justify-content: center;
            font-size: 10px; font-weight: 600;
          }
          .specs-main { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
          .specs-topbar {
            padding: 0 24px; height: 52px;
            display: flex; align-items: center;
            border-bottom: 1px solid var(--border-subtle);
            background: var(--bg-surface); flex-shrink: 0;
          }
          .specs-topbar h1 { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; }
          .specs-content { flex: 1; overflow-y: auto; display: flex; justify-content: center; }

          /* Document rendering */
          .doc {
            width: 100%; max-width: 720px; padding: 48px 40px 120px; display: none;
          }
          .doc.active { display: block; }
          .doc h1 { font-size: 24px; font-weight: 700; letter-spacing: -0.03em; margin-bottom: 8px; }
          .doc h2 {
            font-size: 16px; font-weight: 600; letter-spacing: -0.01em;
            margin: 32px 0 12px; padding-bottom: 6px;
            border-bottom: 1px solid var(--border-subtle);
          }
          .doc h3 { font-size: 14px; font-weight: 600; margin: 20px 0 8px; }
          .doc p { font-size: 14px; color: var(--text-secondary); line-height: 1.75; margin-bottom: 12px; }
          .doc strong { color: var(--text-primary); font-weight: 600; }
          .doc ul, .doc ol { padding-left: 24px; margin: 0 0 16px; color: var(--text-secondary); }
          .doc li { margin-bottom: 6px; line-height: 1.6; }
          .doc code {
            font-size: 12px; background: var(--bg-inset); padding: 1px 5px;
            border-radius: 3px; font-family: ui-monospace, monospace;
          }
          .code-block {
            background: var(--bg-inset); padding: 14px 16px; border-radius: 8px;
            margin: 12px 0; overflow-x: auto; font-size: 13px;
            font-family: ui-monospace, monospace; line-height: 1.6; color: var(--text-secondary);
          }
          .code-block code { background: none; padding: 0; font-size: inherit; }
          .criterion {
            display: flex; align-items: flex-start; gap: 10px;
            padding: 5px 0; font-size: 14px; color: var(--text-secondary); line-height: 1.6;
          }
          .check {
            width: 16px; height: 16px; border-radius: 4px;
            border: 1.5px solid var(--border-default); flex-shrink: 0; margin-top: 3px;
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
          .open-q p { font-size: 13px; color: var(--text-secondary); line-height: 1.6; margin-bottom: 6px; }
          .open-q p:last-child { margin-bottom: 0; }
        `,
        }}
      />
      <div className="specs-layout">
        <div className="specs-sidebar">
          <div className="specs-sidebar-header">
            <div className="specs-logo">W</div>
            <div className="specs-logo-text">Workhorse</div>
          </div>
          <div className="specs-sidebar-nav">
            <div className="specs-nav-label">v1 Specs</div>
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
          <div className="specs-sidebar-footer">
            <div className="specs-avatar">E</div>
            Edwin M-F
          </div>
        </div>

        <div className="specs-main">
          <div className="specs-topbar">
            <h1>v1 Specs — Review</h1>
          </div>
          <div className="specs-content">
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
    </>
  );
}
