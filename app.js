const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
const crypto = require('crypto');
const randomstring = require('randomstring');

const { getCSVData, uploadFile, writeCSVData, getTreeData, getFlatData } = require('./helper');

const app = express();

const PORT = process.env.PORT || 4500;

app.use(express.static('static'))
app.use(cors({ origin: true }));
app.use(express.json());
app.use(fileUpload());

app.get('/', (req, res) => {
    res.send("Server is running now!")
    res.end();
})

app.post('/api/reqjson', (req, res) => {
    // fs.writeFileSync('./static/req.json', JSON.stringify(req.body));

    res.send("done!")
    res.end();
})

app.post('/api/upload', async (req, res) => {
    if (!req.files) {
        res.status(500).send({ msg: "File is not found" });
        res.end();
        return;
    }

    const myFile = req.files.file;

    const strSplitted = String(myFile.name).split('.');
    const ext = strSplitted[strSplitted.length - 1];

    if (ext !== 'csv') {
        res.status(501).send({ msg: "File type is not csv" });
    }

    const timestamp = Math.round(Date.now() / 1000);
    const outFilename = `output-${timestamp}.csv`;

    const ret = await uploadFile(myFile, `${__dirname}/static/temp.csv`)
        .then(res => res)
        .catch(err => {
            console.log(err)
            res.status(502).send({ msg: "Internal Server Error" });
            res.end();
            return;
        });
    if (ret !== true) {
        res.status(502).send({ msg: "Internal Server Error" });
        res.end();
        return;
    }

    const inputCsvData = await getCSVData(`./static/temp.csv`);
    if (inputCsvData.length < 2) {
        res.status(503).send({ msg: "Empty CSV" });
        res.end();
        return;
    }
    
    const rootTag = inputCsvData[1][1];
    const inputRows = [];
    let hashMap = {};
    let rndstrMap = {};
    inputCsvData.slice(1).forEach(row => {
        const key = crypto.createHash('md5').update(row[0]).digest('hex');

        if (hashMap[key] === true) {
            let str = randomstring.generate(10);
            while (rndstrMap[str] === true) {
                str = randomstring.generate(10);
            }
            rndstrMap[str] = true;

            inputRows.push({
                paaTitle: str + row[0],
                parent: row[1] === rootTag ? null : row[1],
                text: row[2],
                url: row[3],
                urlTitle: row[4],
            });
        } else {
            hashMap[key] = true;

            inputRows.push({
                paaTitle: row[0],
                parent: row[1] === rootTag ? null : row[1],
                text: row[2],
                url: row[3],
                urlTitle: row[4],      
            });
        }
    });

    let rows = [];
    try {
        const tree = getTreeData(inputRows);

        if (tree.length === 0) {
            res.status(503).send({ msg: "Invalid CSV" });
            res.end();
            return;
        }

        tree.forEach(data => {
            rows = rows.concat(getFlatData(data));
        });
    } catch (e) {
        console.log(e);
        res.status(502).send({ msg: "Internal Server Error" });
        res.end();
        return;
    }

    const outputCsvData = rows.map(row => {
        let { paaTitle } = row;
        if (rndstrMap[paaTitle.slice(0, 10)] === true) paaTitle = paaTitle.slice(10);

        return {
            paaTitle: paaTitle,
            text: row.text,
            url: row.url,
            urlTitle: row.urlTitle,
        }
    });

    writeCSVData(`${__dirname}/static/${outFilename}`, outputCsvData, false);

    res.send({ file: myFile.name, path: `/${outFilename}`, ty: myFile.type });
    res.end();
    return;
})

app.listen(PORT, console.log(
    `Server started on port ${PORT}`)
);