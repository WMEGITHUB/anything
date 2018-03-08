const fs = require('fs');
const path = require('path');
const Handlebars = require('handlebars');
const promisify = require('util').promisify;
const stat = promisify(fs.stat);
const readdir = promisify(fs.readdir);
const mime = require('./mime');
const config = require('./../config/defaultConf');
const compress = require('./compress');

const tplPath = path.join(__dirname, '../template/dir.tpl');
const source = fs.readFileSync(tplPath);
const template = Handlebars.compile(source.toString())

module.exports = async function (req, res, filePath) {
  try {
    const stats = await stat(filePath);
    if (stats.isFile()) {
      res.statusCode = 200;
      const contentType = mime(filePath);
      res.setHeader('Content-Type', contentType);
      let rs = fs.createReadStream(filePath);
      if (filePath.match(config.compress)) {
        rs = compress(rs, req, res);
      }
      rs.pipe(res);
    } else if (stats.isDirectory()) {
      const files = await readdir(filePath);
      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html');
      const dir = path.relative(config.root, filePath);
      const data = {
        files: files.map(file => {
          return {
            file,
            icon: mime(file)
          }
        }),
        title: path.basename(filePath),
        dir: dir ? `/${dir}` : ''
      }
      res.end(template(data));
    }
  } catch (error) {
    res.statusCode = 404;
    res.setHeader('content-Type', 'text/plain');
    res.end(`${filePath} is not a directory or file\n ${error.toString()}`);
    return;
  }
}