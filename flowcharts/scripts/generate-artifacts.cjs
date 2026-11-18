'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { chromium } = require('playwright-core');

const root = path.resolve(__dirname, '..');
const mermaidPath = path.resolve(
  root,
  '../评审/CRM影响评审/流程图/静态页面/assets/mermaid.min.js'
);

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '<br>');
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/\n/g, '&lt;br&gt;');
}

function safeId(value) {
  return String(value).replace(/[^a-zA-Z0-9_-]/g, '_');
}

function number(value) {
  return Math.round(value * 100) / 100;
}

function sha256(value) {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

function fixedScaleSvg(svg, label) {
  const match = svg.match(/viewBox="([^"]+)"/);
  if (!match) throw new Error(`SVG without viewBox: ${label}`);
  const [, , width, height] = match[1].trim().split(/\s+/).map(Number);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error(`Invalid SVG viewBox: ${label}`);
  }
  return svg.replace(
    '<svg ',
    `<svg role="img" aria-label="${escapeHtml(label)}" style="width:${number(width)}px;height:${number(height)}px;max-width:none;" `
  );
}

function extractDiagrams(markdown) {
  const lines = markdown.split(/\r?\n/);
  const result = [];
  let language = 'CN';
  let heading = '';

  lines.forEach((line, index) => {
    if (/^##\s+English\b/.test(line)) language = 'EN';
    if (/^#{2,4}\s+/.test(line)) heading = line.replace(/^#{2,4}\s+/, '');
    if (/^```mermaid\s*$/.test(line)) {
      const endIndex = lines.findIndex((candidate, candidateIndex) => candidateIndex > index && /^```\s*$/.test(candidate));
      if (endIndex < 0) throw new Error(`Unclosed Mermaid block after line ${index + 1}`);
      const originalHeading = heading || 'Diagram';
      const numberMatch = originalHeading.match(/^(\d+(?:\.\d+)*)\.?\s+/);
      result.push({
        heading: originalHeading.replace(/^\d+(?:\.\d+)*\.?\s+/, ''),
        number: numberMatch ? Number(numberMatch[1]) : result.length + 1,
        language,
        code: lines.slice(index + 1, endIndex).join('\n').trim() + '\n',
      });
    }
  });

  return result;
}

async function renderDiagram(page, code, id) {
  return page.evaluate(
    async ({ code, id }) => {
      const output = await window.mermaid.render(id, code);
      return output.svg;
    },
    { code, id }
  );
}

async function inspectSvg(page, svg, kind) {
  await page.setContent('<!doctype html><html><head><meta charset="utf-8"></head><body></body></html>');
  await page.evaluate(source => {
    document.body.innerHTML = source;
  }, svg);

  return page.evaluate(kind => {
    const svgEl = document.querySelector('svg');
    const root = svgEl.getBoundingClientRect();
    const relative = element => {
      const rect = element.getBoundingClientRect();
      return {
        x: rect.left - root.left,
        y: rect.top - root.top,
        width: rect.width,
        height: rect.height,
      };
    };
    const center = box => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
    const distanceToBox = (point, box) => {
      const cx = Math.max(box.x, Math.min(point.x, box.x + box.width));
      const cy = Math.max(box.y, Math.min(point.y, box.y + box.height));
      return Math.hypot(point.x - cx, point.y - cy);
    };
    const textOf = element => {
      const foreign = element.querySelector('foreignObject');
      const source = foreign || element;
      const clone = source.cloneNode(true);
      clone.querySelectorAll('br').forEach(br => br.replaceWith('\n'));
      const text = clone.textContent || source.innerText || element.textContent || '';
      return text.trim().replace(/\u00a0/g, ' ');
    };

    let nodeElements = [];
    if (kind === 'sequence') {
      nodeElements = [...document.querySelectorAll('svg g[id^="root-"]')]
        .filter(group => group.querySelector('.actor-top'))
        .sort((a, b) => a.getBoundingClientRect().left - b.getBoundingClientRect().left);
    } else {
      nodeElements = [...document.querySelectorAll('g.node, g.cluster')];
    }

    const nodes = nodeElements.map((element, index) => {
      const box = relative(element);
      const text = textOf(element);
      const isCluster = element.classList.contains('cluster');
      const hasPolygon = Boolean(element.querySelector('polygon'));
      const hasCircle = Boolean(element.querySelector('circle'));
      const hasEllipse = Boolean(element.querySelector('ellipse'));
      const squareish = box.width && Math.abs(box.width - box.height) / Math.max(box.width, box.height) < 0.22;
      let shape = 'rectangle';
      if (kind === 'sequence') shape = 'actor';
      else if (isCluster) shape = 'cluster';
      else if (hasPolygon && squareish) shape = 'diamond';
      else if (hasCircle || hasEllipse) shape = 'ellipse';
      return {
        id: `n${index + 1}`,
        domId: element.id,
        text,
        shape,
        box,
        center: center(box),
      };
    });

    const pathEndpoint = pathData => {
      const start = pathData.match(/(?:^|\s)M\s*(-?\d+(?:\.\d+)?)[ ,]+(-?\d+(?:\.\d+)?)/i);
      const numbers = [...pathData.matchAll(/-?\d+(?:\.\d+)?/g)].map(match => Number(match[0]));
      if (!start || numbers.length < 4) return null;
      return {
        start: { x: Number(start[1]), y: Number(start[2]) },
        end: { x: numbers[numbers.length - 2], y: numbers[numbers.length - 1] },
      };
    };

    let edgeElements = [];
    if (kind === 'flowchart') {
      edgeElements = [...document.querySelectorAll('path.flowchart-link')];
    } else if (kind === 'state') {
      edgeElements = [...document.querySelectorAll('path[id^="edge"]')];
    } else {
      edgeElements = [...document.querySelectorAll('line.messageLine0, line.messageLine1, path.messageLine0, path.messageLine1')]
        .filter(element => element.tagName === 'line' || element.getAttribute('d'));
    }

    const rawEdges = edgeElements.map((element, index) => {
      let points = null;
      let dashed = false;
      if (element.tagName === 'line') {
        points = {
          start: { x: Number(element.getAttribute('x1')), y: Number(element.getAttribute('y1')) },
          end: { x: Number(element.getAttribute('x2')), y: Number(element.getAttribute('y2')) },
        };
        dashed = element.classList.contains('messageLine1');
      } else {
        points = pathEndpoint(element.getAttribute('d') || '');
        dashed = /dashed|dotted/i.test(element.getAttribute('class') || '');
      }
      if (!points) return null;
      return {
        id: `e${index + 1}`,
        domId: element.id,
        points,
        dashed,
        middle: {
          x: (points.start.x + points.end.x) / 2,
          y: (points.start.y + points.end.y) / 2,
        },
      };
    }).filter(Boolean);

    for (const edge of rawEdges) {
      const byEndpoint = endpoint => {
        if (kind === 'sequence') {
          return nodes.reduce((best, node) => {
            const distance = Math.abs(endpoint.x - node.center.x);
            return !best || distance < best.distance ? { node, distance } : best;
          }, null).node;
        }
        return nodes.reduce((best, node) => {
          const distance = distanceToBox(endpoint, node.box);
          return !best || distance < best.distance ? { node, distance } : best;
        }, null).node;
      };
      edge.source = byEndpoint(edge.points.start);
      edge.target = byEndpoint(edge.points.end);
    }

    let labelElements = [];
    if (kind === 'sequence') labelElements = [...document.querySelectorAll('text.messageText')];
    else labelElements = [...document.querySelectorAll('g.edgeLabel')];
    const seenLabels = new Set();
    const labels = labelElements.map(element => {
      const text = textOf(element).trim();
      const box = relative(element);
      return { text, box, center: center(box) };
    }).filter(label => {
      if (!label.text) return false;
      const key = `${label.text}|${Math.round(label.center.x)}|${Math.round(label.center.y)}`;
      if (seenLabels.has(key)) return false;
      seenLabels.add(key);
      return true;
    });

    for (const label of labels) {
      let best = null;
      for (const edge of rawEdges) {
        const distance = Math.hypot(label.center.x - edge.middle.x, label.center.y - edge.middle.y);
        if (!best || distance < best.distance) best = { edge, distance };
      }
      if (best && best.distance < 220) best.edge.label = best.edge.label ? `${best.edge.label}<br>${label.text}` : label.text;
    }

    const viewBox = (svgEl.getAttribute('viewBox') || '').split(/\s+/).map(Number);
    return {
      nodes,
      edges: rawEdges,
      width: viewBox.length === 4 ? viewBox[2] : root.width,
      height: viewBox.length === 4 ? viewBox[3] : root.height,
      sequenceActorCount: kind === 'sequence' ? nodes.length : 0,
    };
  }, kind);
}

function styleForNode(node) {
  const common = 'whiteSpace=wrap;html=1;align=center;verticalAlign=middle;fontFamily=Helvetica;fontSize=13;spacing=4;';
  if (node.shape === 'diamond') return `rhombus;${common}fillColor=#fff7e6;strokeColor=#7688a0;`;
  if (node.shape === 'ellipse') return `ellipse;${common}fillColor=#eef7ee;strokeColor=#7688a0;`;
  if (node.shape === 'cluster') return `rounded=1;${common}dashed=1;fillColor=#f5f7fa;strokeColor=#98a6b5;opacity=70;`;
  if (node.shape === 'actor') return `rounded=0;${common}fillColor=#eaf1ff;strokeColor=#6d83a8;`;
  return `rounded=1;${common}fillColor=#f7fbff;strokeColor=#7688a0;`;
}

function drawioPage(diagram, inspection, index) {
  const diagramNumber = diagram.number || index + 1;
  const pageId = safeId(`flow-${diagramNumber}-${diagram.heading}`);
  const width = Math.max(900, Math.ceil(inspection.width) + 160);
  const height = Math.max(700, Math.ceil(inspection.height) + 140);
  const cells = [];

  cells.push(`<mxCell id="${pageId}-title" value="${diagramNumber}. ${xmlEscape(diagram.heading)}" style="text;html=1;align=left;fontSize=20;fontStyle=1;" vertex="1" parent="1"><mxGeometry x="20" y="20" width="${number(width - 40)}" height="34" as="geometry"/></mxCell>`);
  cells.push(`<mxCell id="${pageId}-note" value="v1.0 | 2026-11-16 | Bilingual labels | Mermaid SHA256: ${sha256(diagram.code)}" style="text;html=1;align=left;fontSize=11;whiteSpace=wrap;" vertex="1" parent="1"><mxGeometry x="20" y="56" width="${number(width - 40)}" height="24" as="geometry"/></mxCell>`);

  for (const node of inspection.nodes) {
    cells.push(`<mxCell id="${pageId}-${node.id}" value="${xmlEscape(node.text || (node.shape === 'ellipse' ? 'terminal' : ''))}" style="${styleForNode(node)}" vertex="1" parent="1"><mxGeometry x="${number(node.box.x + 40)}" y="${number(node.box.y + 100)}" width="${number(node.box.width)}" height="${number(node.box.height)}" as="geometry"/></mxCell>`);
  }

  if (inspection.sequenceActorCount) {
    inspection.nodes.forEach((node, actorIndex) => {
      const bottomId = `${pageId}-bottom-${actorIndex + 1}`;
      cells.push(`<mxCell id="${bottomId}" value="${xmlEscape(node.text)}" style="${styleForNode(node)}" vertex="1" parent="1"><mxGeometry x="${number(node.box.x + 40)}" y="${number(inspection.height + 100)}" width="${number(node.box.width)}" height="${number(node.box.height)}" as="geometry"/></mxCell>`);
      cells.push(`<mxCell id="${pageId}-life-${actorIndex + 1}" value="" style="endArrow=none;dashed=1;html=1;strokeColor=#8792a2;" edge="1" parent="1" source="${pageId}-${node.id}" target="${bottomId}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
    });
  }

  for (const edge of inspection.edges) {
    const style = `endArrow=block;html=1;rounded=1;strokeColor=#5d6b7c;fontSize=11;${edge.dashed ? 'dashed=1;' : ''}`;
    cells.push(`<mxCell id="${pageId}-${edge.id}" value="${xmlEscape(edge.label || '')}" style="${style}" edge="1" parent="1" source="${pageId}-${edge.source.id}" target="${pageId}-${edge.target.id}"><mxGeometry relative="1" as="geometry"/></mxCell>`);
  }

  return `<diagram id="${pageId}" name="${xmlEscape(`${diagramNumber}. ${diagram.heading}`)}" source_sha256="${sha256(diagram.code)}"><mxGraphModel dx="1400" dy="900" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="0" pageScale="1" pageWidth="${number(width)}" pageHeight="${number(height)}"><root><mxCell id="0"/><mxCell id="1" parent="0"/>${cells.join('')}</root></mxGraphModel></diagram>`;
}

const GROUP_LABELS = {
  '01-业务全景与角色': 'Business Overview / 业务全景与角色',
  '02-合作伙伴与身份': 'Partner And Identity / 合作伙伴与身份',
  '03-推广点击与归因': 'Promotion And Attribution / 推广点击与归因',
  '04-资格佣金与风险': 'Commission And Risk / 资格佣金与风险',
  '05-资金结算与支付': 'Settlement And Payment / 资金结算与支付',
  '06-系统边界与配置': 'Boundaries And Configuration / 系统边界与配置',
};

function buildCatalog(files) {
  return files.map(file => {
    const title = path.basename(file, '.md');
    const markdown = fs.readFileSync(path.join(root, file), 'utf8');
    return {
      title,
      href: `${encodeURIComponent(title)}.html`,
      label: GROUP_LABELS[title] || title,
      diagrams: extractDiagrams(markdown),
    };
  });
}

function globalMenu(catalog, currentTitle) {
  return catalog.map(group => {
    const activeGroup = group.title === currentTitle;
    const children = group.diagrams.map(diagram => {
      const href = activeGroup ? `#diagram-${diagram.number}` : `${group.href}#diagram-${diagram.number}`;
      return `<a class="menu-child${activeGroup ? ' current-page' : ''}" href="${href}"><span>${diagram.number}. ${escapeHtml(diagram.heading)}</span></a>`;
    }).join('');
    return `<div class="menu-group"><a class="menu-parent${activeGroup ? ' active' : ''}" href="${group.href}"><span>${escapeHtml(group.label)}</span></a><div class="menu-children">${children}</div></div>`;
  }).join('');
}

function htmlPage(file, diagrams, rendered, catalog) {
  const title = path.basename(file, '.md');
  const nav = `<a class="menu-parent home" href="00.html"><span>Index / 总览</span></a>${globalMenu(catalog, title)}`;
  const sections = rendered.map((svg, index) => {
    const diagram = diagrams[index];
    return `<section class="stage-card" id="diagram-${diagram.number}"><div class="section-header"><h2>${diagram.number}. ${escapeHtml(diagram.heading)}</h2><button type="button" data-fullscreen aria-expanded="false"><span aria-hidden="true">⛶</span>全屏 / Fullscreen</button></div><div class="stage" tabindex="0" aria-label="${escapeHtml(diagram.heading)}">${svg}</div></section>`;
  }).join('\n');

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
:root{color-scheme:light;--line:#d8e0e8;--text:#1f2937;--muted:#5d6b7a;--bg:#f7f9fb;--panel:#fff;--stage-width:1440px;--stage-ratio:1440/900}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 system-ui,-apple-system,"Segoe UI",sans-serif}.shell{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}
.sidebar{position:sticky;top:0;height:100vh;overflow:auto;background:#fff;border-right:1px solid var(--line);padding:16px 12px}.sidebar h2{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:0 8px 10px}.sidebar a{display:block;color:#28527a;text-decoration:none;padding:7px 8px;border-radius:4px;line-height:1.35}.sidebar a:hover{background:#eef4f8}.sidebar a.active{background:#e5edf5;font-weight:700}.sidebar .menu-group+.menu-group{margin-top:8px}.sidebar .menu-parent{font-weight:700;font-size:13px}.sidebar .menu-child{font-size:12px;color:#4a5b6b;padding:5px 8px 5px 18px}.sidebar .menu-child.current-page{color:#173b5d;background:#f3f7fa}.sidebar .menu-children{margin:2px 0 4px}.sidebar a span{display:block}
.main{min-width:0}header{background:#fff;border-bottom:1px solid var(--line);padding:14px 24px;display:flex;justify-content:space-between;align-items:center;gap:16px}.titlebar h1{font-size:19px;margin:0}.titlebar span{display:block;color:var(--muted);font-size:12px}.file-link{color:#28527a;text-decoration:none;font-size:13px;white-space:nowrap}.file-link:hover{text-decoration:underline}
main{padding:20px 24px 32px}.stage-card{background:var(--panel);border:1px solid var(--line);border-radius:6px;margin:0 0 22px;overflow:hidden}.section-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid var(--line)}h2{font-size:15px;margin:0}h2 small{color:var(--muted);font-weight:400}.section-header button{display:inline-flex;align-items:center;gap:6px;border:1px solid #a8b8c8;background:#fff;color:#2b3b4b;border-radius:4px;padding:6px 10px;font:12px/1 inherit;cursor:pointer;white-space:nowrap}.section-header button:hover{background:#f2f6f9}.section-header button span{font-size:14px;line-height:1}
.stage{width:min(var(--stage-width),100%);aspect-ratio:var(--stage-ratio);min-height:420px;margin:0 auto;background:#fff;padding:10px;overflow:auto}.stage svg{max-width:none!important;display:block;margin:auto}.stage:fullscreen,.stage-card:fullscreen{background:#fff}.stage-card:fullscreen{border:0;border-radius:0;display:flex;flex-direction:column;overflow:hidden}.stage-card:fullscreen .section-header{flex:0 0 auto}.stage-card:fullscreen .stage,.stage-card.fallback-fullscreen .stage{width:100%;height:100%;aspect-ratio:auto;flex:1 1 auto}.stage-card.fallback-fullscreen{position:fixed;inset:0;background:#fff;z-index:100;display:flex;flex-direction:column}
footer{padding:4px 24px 30px;color:var(--muted)}
@media(max-width:900px){.shell{grid-template-columns:220px minmax(0,1fr)}.sidebar{padding:12px 8px}.sidebar .menu-parent{font-size:12px}.sidebar .menu-child{font-size:11px;padding-left:14px}header,main,footer{padding-left:14px;padding-right:14px}.section-header{align-items:flex-start;flex-direction:column}.section-header button{align-self:flex-end}}
</style>
</head>
<body><div class="shell"><aside class="sidebar" aria-label="Global diagram menu / 全局流程图菜单"><h2>Global Menu / 全局菜单</h2><nav class="global-menu">${nav}</nav></aside><div class="main"><header><div class="titlebar"><h1>${escapeHtml(title)}</h1><span>Fixed-stage offline preview / 固定画布离线预览</span></div><a class="file-link" href="${encodeURIComponent(title)}-Drawio.xml">Drawio XML</a></header><main>${sections}</main><footer>Static offline HTML generated from Mermaid Markdown / 由 Mermaid Markdown 生成的离线静态页面.</footer></div></div>
<script>
const setFullscreenState=(button,active)=>{button.setAttribute('aria-expanded',String(active));button.innerHTML=active?'退出全屏 / Exit fullscreen':'<span aria-hidden="true">⛶</span>全屏 / Fullscreen'};
document.addEventListener('click',async event=>{const button=event.target.closest('[data-fullscreen]');if(!button)return;const card=button.closest('.stage-card');const shouldEnter=button.getAttribute('aria-expanded')!=='true';try{if(shouldEnter){if(card.requestFullscreen)await card.requestFullscreen();else card.classList.add('fallback-fullscreen')}else{if(document.fullscreenElement)await document.exitFullscreen();else card.classList.remove('fallback-fullscreen')}}catch(error){card.classList.toggle('fallback-fullscreen')}const active=document.fullscreenElement===card||card.classList.contains('fallback-fullscreen');setFullscreenState(button,active)});
document.addEventListener('fullscreenchange',()=>{for(const button of document.querySelectorAll('[data-fullscreen]'))setFullscreenState(button,document.fullscreenElement===button.closest('.stage-card'))});
</script></body></html>`;
}

function indexPage(catalog) {
  const items = catalog.map(group => {
    return `<a class="card" href="${group.href}"><strong>${escapeHtml(group.label)}</strong><span>${group.diagrams.map(diagram => diagram.number).join(' · ')}</span></a>`;
  }).join('');
  const nav = `<a class="menu-parent home active" href="00.html"><span>Index / 总览</span></a>${globalMenu(catalog, '__none__')}`;
  return `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Flow Diagrams v2 / 流程图 v2</title><style>:root{color-scheme:light;--line:#d8e0e8;--text:#1f2937;--muted:#5d6b7a;--bg:#f7f9fb;--panel:#fff}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.5 system-ui,sans-serif}.shell{display:grid;grid-template-columns:280px minmax(0,1fr);min-height:100vh}.sidebar{position:sticky;top:0;height:100vh;overflow:auto;background:#fff;border-right:1px solid var(--line);padding:16px 12px}.sidebar h2{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:var(--muted);margin:0 8px 10px}.sidebar a{display:block;color:#28527a;text-decoration:none;padding:7px 8px;border-radius:4px;line-height:1.35}.sidebar a:hover{background:#eef4f8}.sidebar a.active{background:#e5edf5;font-weight:700}.sidebar .menu-group+.menu-group{margin-top:8px}.sidebar .menu-parent{font-weight:700;font-size:13px}.sidebar .menu-child{font-size:12px;color:#4a5b6b;padding:5px 8px 5px 18px}.sidebar .menu-children{margin:2px 0 4px}.sidebar a span{display:block}.main{padding:32px 28px}h1{font-size:24px;margin:0 0 8px}p{color:var(--muted)}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px}.card{display:flex;flex-direction:column;gap:6px;background:#fff;border:1px solid var(--line);border-radius:6px;padding:16px;text-decoration:none;color:#25364a}.card:hover{border-color:#7f96ad}.card span{color:#64748b;font-size:12px}@media(max-width:900px){.shell{grid-template-columns:220px minmax(0,1fr)}.sidebar{padding:12px 8px}.sidebar .menu-parent{font-size:12px}.sidebar .menu-child{font-size:11px;padding-left:14px}.main{padding:20px 14px}}</style></head><body><div class="shell"><aside class="sidebar" aria-label="Global diagram menu / 全局流程图菜单"><h2>Global Menu / 全局菜单</h2><nav class="global-menu">${nav}</nav></aside><main class="main"><h1>Flow Diagrams v2 / 流程图 v2</h1><p>Open a group preview or its matching Drawio XML file. / 打开分组预览或对应 Drawio XML。</p><div class="grid">${items}</div></main></div></body></html>`;
}

async function main() {
  const files = fs.readdirSync(root).filter(file => file.endsWith('.md') && file !== 'README.md').sort();
  const catalog = buildCatalog(files);
  const browser = await chromium.launch({ executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage({ viewport: { width: 1800, height: 1200 } });
  await page.setContent('<!doctype html><html><body></body></html>');
  await page.addScriptTag({ path: mermaidPath });
  await page.evaluate(() => window.mermaid.initialize({ startOnLoad: false, securityLevel: 'loose', theme: 'default' }));

  let totalDiagrams = 0;
  for (const group of catalog) {
    const file = `${group.title}.md`;
    const diagrams = group.diagrams;
    const rendered = [];
    const inspections = [];

    for (let index = 0; index < diagrams.length; index++) {
      const id = `flow-v2-${files.indexOf(file)}-${index}`;
      const svg = await renderDiagram(page, diagrams[index].code, id);
      rendered.push(fixedScaleSvg(svg, diagrams[index].heading));
      const kind = diagrams[index].code.includes('sequenceDiagram') ? 'sequence' : diagrams[index].code.includes('stateDiagram-v2') ? 'state' : 'flowchart';
      inspections.push(await inspectSvg(page, svg, kind));
      totalDiagrams++;
    }

    const base = path.basename(file, '.md');
    fs.writeFileSync(path.join(root, `${base}.html`), htmlPage(file, diagrams, rendered, catalog));
    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<mxfile host="app.diagrams.net" version="24.7.17" compressed="false" revision="v0.1" modified="2026-11-16T00:00:00.000Z">\n${inspections.map((inspection, index) => drawioPage(diagrams[index], inspection, index)).join('\n')}\n</mxfile>\n`;
    fs.writeFileSync(path.join(root, `${base}-Drawio.xml`), xml);
  }

  fs.writeFileSync(path.join(root, '00.html'), indexPage(catalog));
  await browser.close();
  console.log(`generated ${files.length} HTML pages, ${files.length} Drawio XML files, and ${totalDiagrams} diagrams`);
}

main().catch(error => {
  console.error(error);
  process.exit(1);
});
