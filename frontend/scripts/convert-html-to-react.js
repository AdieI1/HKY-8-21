/**
 * Converts HTML body content to React JSX for page components.
 * Run: node scripts/convert-html-to-react.js
 */
const fs = require('fs');
const path = require('path');

const HTML_DIR = path.join(__dirname, '..', 'this is the folder');
const PAGES_DIR = path.join(__dirname, '..', 'src', 'pages');
const SCRIPTS_DIR = path.join(__dirname, '..', 'public', 'javascript');

const PAGE_MAP = {
  'login.html': { component: 'LoginPage', scriptName: null },
  'admin.html': { component: 'OverviewPage', scriptName: 'admin.js' },
  'requests.html': { component: 'RequestsPage', scriptName: 'requests.js' },
  'dispatch.html': { component: 'DispatchPage', scriptName: 'dispatch.js' },
  'delivery.html': { component: 'DeliveryPage', scriptName: 'delivery.js' },
  'drivers.html': { component: 'DriversPage', scriptName: 'drivers.js' },
  'vehicles.html': { component: 'VehiclesPage', scriptName: 'vehicles.js' },
  'analytics.html': { component: 'AnalyticsPage', scriptName: 'analytics.js' },
  'customers.html': { component: 'CustomersPage', scriptName: 'customers.js' },
};

const ROUTE_MAP = {
  'admin.html': '/overview',
  'requests.html': '/requests',
  'dispatch.html': '/dispatch',
  'delivery.html': '/delivery',
  'drivers.html': '/drivers',
  'vehicles.html': '/vehicles',
  'analytics.html': '/analytics',
  'customers.html': '/customers',
};

function extractBody(html) {
  const match = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  return match ? match[1].trim() : '';
}

function extractScripts(body) {
  const scripts = [];
  const withoutScripts = body.replace(/<script[^>]*src="([^"]+)"[^>]*>\s*<\/script>/gi, (_, src) => {
    scripts.push({ type: 'external', src });
    return '';
  });
  const cleaned = withoutScripts.replace(/<script[^>]*>([\s\S]*?)<\/script>/gi, (_, code) => {
    scripts.push({ type: 'inline', code: code.trim() });
    return '';
  });
  return { content: cleaned.trim(), scripts };
}

function convertStyleAttr(value) {
  const rules = value
    .split(';')
    .map((r) => r.trim())
    .filter(Boolean);
  const obj = rules
    .map((rule) => {
      const [prop, ...rest] = rule.split(':');
      if (!prop || !rest.length) return null;
      const camel = prop.trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
      const val = rest.join(':').trim();
      return `${camel}: '${val.replace(/'/g, "\\'")}'`;
    })
    .filter(Boolean)
    .join(', ');
  return `{{ ${obj} }}`;
}

function convertOnClick(value) {
  const trimmed = value.trim();
  if (trimmed.includes('return false')) {
    const call = trimmed.replace(/;\s*return false;?\s*$/, '').trim();
    return `{ (e) => { e.preventDefault(); ${call}; } }`;
  }
  if (trimmed.includes('event.stopPropagation()')) {
    return `{ (e) => { e.stopPropagation(); ${trimmed.replace(/event\.stopPropagation\(\);\s*/, '')} } }`;
  }
  return `{ () => { ${trimmed} } }`;
}

function selfCloseTags(content) {
  return content.replace(/<(input|img|br|hr|meta|link)([^>]*?)(\/?)>/gi, (full, tag, attrs, slash) => {
    if (slash || full.endsWith('/>')) {
      return `<${tag}${attrs.trimEnd()} />`;
    }
    return `<${tag}${attrs} />`;
  });
}

function convertNavLinks(jsx) {
  let result = jsx;
  Object.entries(ROUTE_MAP).forEach(([file, route]) => {
    const escaped = file.replace('.', '\\.');
    result = result.replace(
      new RegExp(`<a href="${escaped}">([\\s\\S]*?)<\\/a>`, 'g'),
      `<Link to="${route}">$1</Link>`
    );
    result = result.replace(
      new RegExp(`<a href="${route}">([\\s\\S]*?)<\\/a>`, 'g'),
      `<Link to="${route}">$1</Link>`
    );
  });
  result = result.replace(
    /<a href=""> Customers <\/a>/g,
    '<Link to="/customers"> Customers </Link>'
  );
  result = result.replace(
    /<a href=""><i className="fas fa-sign-out-alt"><\/i> Logout<\/a>/g,
    '<Link to="/"><i className="fas fa-sign-out-alt"></i> Logout</Link>'
  );
  return result;
}

function convertHtmlToJsx(html) {
  let jsx = html;

  jsx = jsx.replace(/<!--([\s\S]*?)-->/g, (_, comment) => `{/* ${comment.trim()} */}`);
  jsx = jsx.replace(/\sclass=/g, ' className=');
  jsx = jsx.replace(/\sfor=/g, ' htmlFor=');
  jsx = jsx.replace(/\sstyle="([^"]*)"/g, (_, style) => ` style=${convertStyleAttr(style)}`);
  jsx = jsx.replace(/\sonclick="([^"]*)"/gi, (_, handler) => ` onClick=${convertOnClick(handler)}`);

  Object.entries(ROUTE_MAP).forEach(([file, route]) => {
    const escaped = file.replace('.', '\\.');
    jsx = jsx.replace(new RegExp(`href="${escaped}"`, 'g'), `href="${route}"`);
    jsx = jsx.replace(new RegExp(`href='${escaped}'`, 'g'), `href='${route}'`);
  });

  jsx = jsx.replace(/<\/main>/g, '</div>');
  jsx = selfCloseTags(jsx);

  return jsx;
}

function wrapComponent(componentName, jsx, scriptFile, usesRouter) {
  const imports = ["import { useEffect } from 'react';"];
  if (usesRouter) {
    imports.push("import { Link } from 'react-router-dom';");
  }

  const loadScript =
    scriptFile &&
    `
  useEffect(() => {
    const scriptId = 'script-${scriptFile}';
    if (document.getElementById(scriptId)) {
      return;
    }
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = \`/javascript/${scriptFile}\`;
    script.async = false;
    document.body.appendChild(script);
  }, []);
`;

  const linkifiedJsx = usesRouter ? convertNavLinks(jsx) : jsx;

  return `${imports.join('\n')}

function ${componentName}() {${loadScript || ''}
  return (
    <>
${linkifiedJsx
  .split('\n')
  .map((line) => `      ${line}`)
  .join('\n')}
    </>
  );
}

export default ${componentName};
`;
}

function convertLoginComponent(jsx) {
  const cleaned = selfCloseTags(jsx);
  return `import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function LoginPage() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState('login_account');

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleSubmit = (e) => {
    e.preventDefault();
    navigate('/overview');
  };

  return (
    <>
${cleaned
  .split('\n')
  .map((line) => {
    let converted = line;
    if (converted.includes('id="eyeicon"')) {
      converted =
        '                  <img src={showPassword ? "images/view.png" : "images/hide.png"} id="eyeicon" className="eyeicon" alt="Toggle password visibility" onClick={togglePassword} role="button" />';
    }
    if (converted.includes('type="password"')) {
      converted = converted.replace('type="password"', 'type={showPassword ? "text" : "password"}');
    }
    if (converted.includes('className="tab"')) {
      converted = converted.replace(
        '<button className="tab" id="login_account">',
        '<button type="button" className={`tab${activeTab === "login_account" ? " active" : ""}`} id="login_account" onClick={() => setActiveTab("login_account")}>'
      );
    }
    if (converted.includes('<form className="form">')) {
      converted = converted.replace('<form className="form">', '<form className="form" onSubmit={handleSubmit}>');
    }
    return `      ${converted}`;
  })
  .join('\n')}
    </>
  );
}

export default LoginPage;
`;
}

function main() {
  if (!fs.existsSync(SCRIPTS_DIR)) {
    fs.mkdirSync(SCRIPTS_DIR, { recursive: true });
  }

  Object.entries(PAGE_MAP).forEach(([htmlFile, { component, scriptName }]) => {
    const htmlPath = path.join(HTML_DIR, htmlFile);
    if (!fs.existsSync(htmlPath)) {
      console.warn(`Skipping missing file: ${htmlFile}`);
      return;
    }

    const html = fs.readFileSync(htmlPath, 'utf8');
    const body = extractBody(html);
    const { content, scripts } = extractScripts(body);
    const jsx = convertHtmlToJsx(content);

    if (htmlFile === 'login.html') {
      fs.writeFileSync(path.join(PAGES_DIR, `${component}.js`), convertLoginComponent(jsx));
      console.log(`Converted ${htmlFile} -> ${component}.js (with React handlers)`);
      return;
    }

    const inlineScript = scripts.find((s) => s.type === 'inline');
    const externalScript = scripts.find((s) => s.type === 'external');

    let scriptFile = scriptName;
    if (inlineScript && !externalScript) {
      fs.writeFileSync(path.join(SCRIPTS_DIR, scriptName), inlineScript.code);
      console.log(`Extracted script -> public/javascript/${scriptName}`);
    } else if (externalScript) {
      scriptFile = path.basename(externalScript.src);
    }

    const usesRouter = html.includes('dashboard-container');
    const componentCode = wrapComponent(component, jsx, scriptFile, usesRouter);
    fs.writeFileSync(path.join(PAGES_DIR, `${component}.js`), componentCode);
    console.log(`Converted ${htmlFile} -> ${component}.js`);
  });
}

main();
