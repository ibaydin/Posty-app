const express = require('express');
const fs = require('node:fs/promises');
const path = require('node:path');
const matter = require('gray-matter');
const { marked } = require('marked');
const sanitizeHtml = require('sanitize-html');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const POSTS_DIR = path.join(__dirname, 'posts');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: false, limit: '32kb' }));
app.use(express.static(path.join(__dirname, 'public')));

marked.setOptions({ gfm: true, breaks: false });

function slugify(value) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 70);
}

async function readPosts() {
  await fs.mkdir(POSTS_DIR, { recursive: true });
  const files = (await fs.readdir(POSTS_DIR)).filter((file) => file.endsWith('.md'));
  const posts = await Promise.all(files.map(async (file) => {
    const source = await fs.readFile(path.join(POSTS_DIR, file), 'utf8');
    const { data, content } = matter(source);
    const slug = path.basename(file, '.md');
    const date = data.date ? new Date(data.date) : new Date(0);
    return {
      slug,
      title: typeof data.title === 'string' && data.title.trim() ? data.title.trim() : slug.replaceAll('-', ' '),
      date: Number.isNaN(date.getTime()) ? new Date(0) : date,
      excerpt: typeof data.excerpt === 'string' ? data.excerpt : content.trim().replace(/\s+/g, ' ').slice(0, 180),
      content
    };
  }));
  return posts.sort((a, b) => b.date - a.date);
}

function renderMarkdown(markdown) {
  return sanitizeHtml(marked.parse(markdown), {
    allowedTags: sanitizeHtml.defaults.allowedTags.concat(['h1', 'h2', 'img']),
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      a: ['href', 'name', 'target', 'rel'],
      img: ['src', 'alt', 'title', 'width', 'height']
    },
    allowedSchemes: ['http', 'https', 'mailto']
  });
}

app.get('/', async (req, res, next) => {
  try {
    res.render('index', { posts: await readPosts() });
  } catch (error) {
    next(error);
  }
});

app.get('/posts/new', (_req, res) => {
  res.render('new-post', { error: null, values: {} });
});

app.post('/posts', async (req, res, next) => {
  const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
  const excerpt = typeof req.body.excerpt === 'string' ? req.body.excerpt.trim() : '';
  const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
  const values = { title, excerpt, content };

  if (!title || title.length > 120 || !content || content.length > 20000 || excerpt.length > 240) {
    return res.status(400).render('new-post', {
      error: 'Add a title (up to 120 characters) and post content (up to 20,000 characters). The excerpt can be up to 240 characters.',
      values
    });
  }

  try {
    await fs.mkdir(POSTS_DIR, { recursive: true });
    const baseSlug = slugify(title) || 'post';
    let slug = baseSlug;
    let suffix = 2;
    while (true) {
      try {
        await fs.access(path.join(POSTS_DIR, `${slug}.md`));
        slug = `${baseSlug}-${suffix++}`;
      } catch {
        break;
      }
    }

    const frontMatter = matter.stringify(content, {
      title,
      excerpt,
      date: new Date().toISOString()
    });
    await fs.writeFile(path.join(POSTS_DIR, `${slug}.md`), frontMatter, { flag: 'wx' });
    res.redirect(`/posts/${slug}`);
  } catch (error) {
    next(error);
  }
});

app.get('/posts/:slug', async (req, res, next) => {
  try {
    const slug = req.params.slug;
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return res.sendStatus(404);
    const source = await fs.readFile(path.join(POSTS_DIR, `${slug}.md`), 'utf8').catch((error) => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!source) return res.status(404).render('not-found');

    const { data, content } = matter(source);
    const parsedDate = data.date ? new Date(data.date) : null;
    res.render('post', {
      post: {
        slug,
        title: typeof data.title === 'string' ? data.title : slug.replaceAll('-', ' '),
        date: parsedDate && !Number.isNaN(parsedDate.getTime()) ? parsedDate : null,
        html: renderMarkdown(content)
      }
    });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).render('error');
});

app.listen(PORT, () => {
  console.log(`Little Press is running at http://localhost:${PORT}`);
});
