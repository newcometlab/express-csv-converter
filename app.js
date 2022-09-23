const express = require('express');
const fileUpload = require('express-fileupload');
const cors = require('cors');
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

    let rows = [];
    try {
        const tree = getTreeData(inputCsvData);

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
        return {
            paaTitle: row.paaTitle,
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