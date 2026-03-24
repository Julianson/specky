---
name: html-diagrams
description: "Creates professional, interactive HTML diagrams, architecture drawings, flowcharts, and system visualizations using React embedded in single-file HTML. Microsoft 4-color branding, language selector (PT-BR/ES/EN), client metadata, versioning, and educational annotations. USE FOR: create interactive diagram, HTML diagram, architecture visualization, interactive flowchart, React diagram, system architecture HTML, interactive architecture, HTML flow, visual architecture, deployment diagram HTML, data flow HTML, agent workflow HTML. DO NOT USE FOR: FigJam diagrams (use figjam-diagrams), static Mermaid (use figjam-diagrams), presentations (use pptx-creator or ms-gamma-presenter), Word documents (use docx-creator)."
---

# HTML Interactive Diagrams

Create professional, interactive HTML diagrams using React (via CDN) embedded in a single self-contained HTML file. Every diagram uses Microsoft branding, includes a language selector, and is educational/didactic by design.

## Architecture: Single-File HTML

Every diagram is **one `.html` file** with:
- React 18 via CDN (no build step, no Node.js required)
- All CSS inline (no external stylesheets)
- All JavaScript inline (no external scripts beyond CDN)
- Open directly in any browser — no server needed

## HTML Template (MANDATORY)

Every generated HTML file MUST follow this exact structure:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{diagram_title}} — {{client_name}}</title>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js" crossorigin></script>
    <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
    <style>
        /* === RESET & BASE === */
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #F9F9F9; color: #323130; }

        /* === HEADER === */
        .header { background: #FFFFFF; border-bottom: 4px solid transparent;
            border-image: linear-gradient(to right, #F25022 25%, #7FBA00 25%, #7FBA00 50%, #00A4EF 50%, #00A4EF 75%, #FFB900 75%) 1;
            padding: 16px 32px; display: flex; justify-content: space-between; align-items: center; }
        .header-left h1 { font-size: 20px; font-weight: 600; color: #0078D4; }
        .header-left .meta { font-size: 12px; color: #605E5C; margin-top: 4px; }
        .header-right { display: flex; align-items: center; gap: 12px; }
        .lang-selector { padding: 6px 12px; border: 1px solid #D2D0CE; border-radius: 4px;
            font-family: 'Segoe UI', sans-serif; font-size: 13px; background: #FFF; cursor: pointer; }
        .lang-selector:focus { outline: 2px solid #0078D4; }

        /* === CONTAINER === */
        .container { max-width: 1200px; margin: 0 auto; padding: 32px; }

        /* === LEGEND === */
        .legend { display: flex; flex-wrap: wrap; gap: 16px; margin-bottom: 24px;
            padding: 16px; background: #FFF; border: 1px solid #E1DFDD; border-radius: 8px; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
        .legend-color { width: 16px; height: 16px; border-radius: 4px; }

        /* === NODES & EDGES === */
        .diagram-canvas { background: #FFF; border: 1px solid #E1DFDD; border-radius: 8px;
            padding: 32px; min-height: 500px; position: relative; overflow: auto; }
        .node { position: absolute; padding: 12px 20px; border-radius: 8px; border: 2px solid;
            background: #FFF; font-size: 14px; font-weight: 500; text-align: center;
            cursor: pointer; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.08); }
        .node:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .node.active { box-shadow: 0 0 0 3px rgba(0,120,212,0.3); }

        /* === TOOLTIP / DETAIL PANEL === */
        .detail-panel { background: #FFF; border: 1px solid #E1DFDD; border-radius: 8px;
            padding: 24px; margin-top: 24px; }
        .detail-panel h3 { color: #0078D4; font-size: 16px; margin-bottom: 12px; }
        .detail-panel p { font-size: 14px; line-height: 1.6; color: #323130; }

        /* === ANNOTATIONS === */
        .annotation { background: #FFF8E7; border-left: 4px solid #FFB900;
            padding: 12px 16px; margin: 12px 0; border-radius: 0 8px 8px 0; font-size: 13px; }
        .annotation.info { background: #E8F4FD; border-left-color: #0078D4; }
        .annotation.success { background: #E8F5E9; border-left-color: #107C10; }
        .annotation.warning { background: #FFF3E0; border-left-color: #FFB900; }
        .annotation.critical { background: #FDEDED; border-left-color: #E81123; }

        /* === FOOTER === */
        .footer { text-align: center; padding: 24px; font-size: 12px; color: #605E5C; }
    </style>
</head>
<body>
    <div id="root"></div>
    <script type="text/babel">
        // === TRANSLATIONS ===
        const translations = {
            en: { /* English strings */ },
            'pt-br': { /* Portuguese strings */ },
            es: { /* Spanish strings */ }
        };

        // === MAIN APP ===
        function App() {
            const [lang, setLang] = React.useState('en');
            const [activeNode, setActiveNode] = React.useState(null);
            const t = translations[lang];

            return (
                <React.Fragment>
                    <Header lang={lang} setLang={setLang} />
                    <div className="container">
                        <Legend lang={lang} />
                        <DiagramCanvas activeNode={activeNode} setActiveNode={setActiveNode} lang={lang} />
                        {activeNode && <DetailPanel node={activeNode} lang={lang} />}
                    </div>
                    <Footer lang={lang} />
                </React.Fragment>
            );
        }

        // === HEADER ===
        function Header({ lang, setLang }) {
            return (
                <div className="header">
                    <div className="header-left">
                        <h1>{{diagram_title}}</h1>
                        <div className="meta">{{client_name}} — {{project_name}} | v{{version}} | {{date}}</div>
                    </div>
                    <div className="header-right">
                        <select className="lang-selector" value={lang} onChange={e => setLang(e.target.value)}>
                            <option value="en">EN</option>
                            <option value="pt-br">PT-BR</option>
                            <option value="es">ES</option>
                        </select>
                    </div>
                </div>
            );
        }

        // === FOOTER ===
        function Footer({ lang }) {
            return (
                <div className="footer">
                    {{client_name}} — {{project_name}} | v{{version}} | {{date}} | Confidential
                </div>
            );
        }

        // === RENDER ===
        ReactDOM.createRoot(document.getElementById('root')).render(<App />);
    </script>
</body>
</html>
```

## Microsoft Brand Palette

| Color | Hex | CSS Variable | Use For |
|-------|-----|-------------|---------|
| **Red** | `#F25022` | `--ms-red` | Security, Critical, Blocked |
| **Green** | `#7FBA00` | `--ms-green` | Success, Testing, Approved |
| **Blue** | `#00A4EF` | `--ms-blue` | Data, Integration, Cloud |
| **Yellow** | `#FFB900` | `--ms-yellow` | Planning, Warnings, Events |
| **Primary Blue** | `#0078D4` | `--ms-primary` | Headers, CTAs, Primary actions |
| **Dark Green** | `#107C10` | `--ms-dark-green` | Confirmed, Healthy |
| **Purple** | `#5C2D91` | `--ms-purple` | AI/Agents, Modernization |
| **Orange** | `#D83B01` | `--ms-orange` | Human actions, Manual steps |
| **Teal** | `#008272` | `--ms-teal` | Monitoring, Infrastructure |

### Neutral Colors

| Element | Hex | Use |
|---------|-----|-----|
| Text primary | `#323130` | Body text |
| Text secondary | `#605E5C` | Metadata, captions |
| Background | `#F9F9F9` | Page background |
| Card background | `#FFFFFF` | Nodes, panels |
| Border | `#E1DFDD` | Card borders |
| Border subtle | `#D2D0CE` | Dividers |

### Header 4-Color Bar

Always include the Microsoft 4-color gradient bar under the header:
```css
border-image: linear-gradient(to right, #F25022 25%, #7FBA00 25%, #7FBA00 50%, #00A4EF 50%, #00A4EF 75%, #FFB900 75%) 1;
```

## Language Selector (MANDATORY)

Every HTML diagram MUST include a language selector in the header with exactly these 3 options:

```jsx
<select className="lang-selector" value={lang} onChange={e => setLang(e.target.value)}>
    <option value="en">EN</option>
    <option value="pt-br">PT-BR</option>
    <option value="es">ES</option>
</select>
```

### Translation Structure

Use a `translations` object with all user-facing strings:

```javascript
const translations = {
    en: {
        title: "System Architecture",
        subtitle: "Overview of the deployment topology",
        legend: "Legend",
        details: "Details",
        clickToExplore: "Click a node to explore",
        // ... all labels, descriptions, annotations
    },
    'pt-br': {
        title: "Arquitetura do Sistema",
        subtitle: "Visão geral da topologia de implantação",
        legend: "Legenda",
        details: "Detalhes",
        clickToExplore: "Clique em um nó para explorar",
    },
    es: {
        title: "Arquitectura del Sistema",
        subtitle: "Visión general de la topología de despliegue",
        legend: "Leyenda",
        details: "Detalles",
        clickToExplore: "Haga clic en un nodo para explorar",
    }
};
```

**Rules:**
- Default language: `en` (English)
- All node labels, descriptions, tooltips, and annotations must be translated
- Technical terms (API, MCP, Docker, Kubernetes) stay in English across all languages
- The language selector persists in the header — always visible

## Metadata (MANDATORY)

Every diagram MUST display in the header and footer:

| Field | Source | Example |
|-------|--------|---------|
| **Client name** | `{{client_name}}` | "Microsoft" |
| **Project name** | `{{project_name}}` | "Three Horizons" |
| **Version** | `{{version}}` | "1.0.0" |
| **Date** | `{{date}}` | "2026-03-04" |

Use semantic versioning for the `version` field.

## Versioning & Archiving

- Filename pattern: `{Title}_v{version}_{YYYY-MM-DD}.html`
- Save to: `output/html/`
- Before overwriting an existing file, move the previous version to `output/html/archive/`
- The version, date, and author/client info are embedded in the header and footer of the HTML itself

## Interactive Features

### Click-to-Explore Nodes

Every node must be clickable. On click, show a detail panel below the diagram with:
- Node name and description (translated)
- Technical details
- Related nodes / connections
- Educational annotation explaining why this component exists

```jsx
function Node({ id, label, color, x, y, onClick, isActive }) {
    return (
        <div
            className={`node ${isActive ? 'active' : ''}`}
            style={{ left: x, top: y, borderColor: color }}
            onClick={() => onClick(id)}
        >
            {label}
        </div>
    );
}
```

### Educational Annotations

Use colored annotation boxes to add didactic context:

```jsx
<div className="annotation info">
    💡 This component handles authentication using OAuth 2.0 with Azure AD,
    ensuring zero-trust access from the edge to the backend.
</div>

<div className="annotation warning">
    ⚠️ This service is a single point of failure. Consider adding a standby
    replica in a secondary region for production workloads.
</div>
```

| Type | CSS Class | Border Color | Use For |
|------|-----------|-------------|---------|
| Info | `annotation info` | `#0078D4` | Explanations, how it works |
| Success | `annotation success` | `#107C10` | Best practices, confirmed patterns |
| Warning | `annotation warning` | `#FFB900` | Caveats, considerations |
| Critical | `annotation critical` | `#E81123` | Risks, security concerns |

### SVG Connections (Arrows)

For connecting nodes, use SVG lines overlaid on the canvas:

```jsx
function Connection({ from, to, label, color = '#605E5C' }) {
    return (
        <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
            <defs>
                <marker id="arrow" markerWidth="10" markerHeight="7" refX="10" refY="3.5" orient="auto">
                    <polygon points="0 0, 10 3.5, 0 7" fill={color} />
                </marker>
            </defs>
            <line x1={from.x} y1={from.y} x2={to.x} y2={to.y}
                stroke={color} strokeWidth="2" markerEnd="url(#arrow)" />
            {label && (
                <text x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 8}
                    textAnchor="middle" fill="#605E5C" fontSize="12">{label}</text>
            )}
        </svg>
    );
}
```

## Diagram Types

| Type | Layout | Use Case |
|------|--------|----------|
| **Architecture** | Layered (top-to-bottom) | System components, tiers, services |
| **Flow** | Left-to-right | Process steps, pipelines, CI/CD |
| **Agent Workflow** | Left-to-right with lanes | AI agent handoffs, automation |
| **Deployment** | Layered with groups | Infrastructure, cloud topology |
| **Data Flow** | Left-to-right | Data pipelines, ETL, event streams |
| **Network** | Free-form | Network topology, connectivity |

### Layout Guidelines

- **Spacing:** 200px horizontal gap, 120px vertical gap between nodes
- **Grouping:** Use visual containers (dashed borders) for logical groups
- **Direction:** Read left-to-right for flows, top-to-bottom for hierarchies
- **Alignment:** Align nodes to an invisible grid

## Factual Integrity

- NEVER fabricate metrics, KPIs, or technical specifications in annotations
- Only reference technologies that actually exist in the system being diagrammed
- Annotation educational content must be technically accurate
- If adding architectural recommendations, cite credible sources (Microsoft Learn, Azure Architecture Center, AWS Well-Architected)

## Quality Checklist

- [ ] Single self-contained HTML file (no external dependencies beyond CDN)
- [ ] React 18 via CDN loads correctly
- [ ] Language selector in header with EN, PT-BR, ES options
- [ ] All user-facing text translated in all 3 languages
- [ ] Header shows client name, project name, version, date
- [ ] Footer shows same metadata + "Confidential"
- [ ] Microsoft 4-color bar under header
- [ ] Segoe UI font throughout
- [ ] Microsoft brand colors only (no arbitrary colors)
- [ ] All nodes are clickable with detail panel
- [ ] Educational annotations explain key concepts
- [ ] SVG arrows connect related nodes
- [ ] Hover effects on nodes (shadow + lift)
- [ ] Responsive layout (works on 1024px+)
- [ ] No fabricated technical claims in annotations
- [ ] Opens correctly in Chrome, Edge, Safari, Firefox
- [ ] Filename follows `{Title}_v{version}_{date}.html` pattern
- [ ] Saved to `output/html/` with previous version archived
