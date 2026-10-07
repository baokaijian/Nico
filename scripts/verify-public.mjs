import fs from 'node:fs';
import path from 'node:path';
import { validatePublicDirectory } from '../shared/publication.mjs';
const root = path.resolve(import.meta.dirname, '..');
const input = path.join(root, 'data/original-input.json');
const seed = fs.existsSync(input) ? JSON.parse(fs.readFileSync(input, 'utf8')) : {};
const privateIds = ['growth', 'fitness', 'nutrition', 'trainings', 'goals'].flatMap(key => (seed[key] || []).map(r => r.id));
const result = validatePublicDirectory(path.join(root, 'dist'), privateIds);
console.log(`公网只读构建、字段与素材白名单检查通过（${result.files}个文件）。`);
