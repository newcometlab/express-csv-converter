const fs = require('fs');
const csv = require('fast-csv');
const { arrayToTree } = require('performant-array-to-tree');

const getTreeData = (data) => {
  const rootTag = data[1][1];     // need to confirm

  const rootNodes = data.filter(row => row[1] === rootTag);
  if (rootNodes.length === 0) return [];

  const arrayData = data.map(row => {
      return {
          paaTitle: row[0],
          parent: row[1] === rootTag ? null : row[1],
          text: row[2],
          url: row[3],
          urlTitle: row[4],
      }
  })
  const tree = arrayToTree(
      arrayData,
      {
          id: "paaTitle",
          parentId: "parent",
          dataField: null,
      }
  );
  return tree;
}

const getFlatData = (treeNode) => {
  let row = { ...treeNode };
  delete row.children;

  if (treeNode.children.length === 0) {
      return row;
  } else {
      let subRows = [];
      treeNode.children.forEach(child => {
          subRows = subRows.concat(
              getFlatData(child)
          );
      });

      return Array(row).concat(subRows);
  }
}

const uploadFile = (myFile, filepath) => {
  return new Promise((resolve, reject) => {
		myFile.mv(filepath, function (err) {
			if (err) {
				reject(err);
				return;
			}

			resolve(true);
		});
  });
}

const getCSVData = (filename, isHeader) =>
  new Promise((resolve, reject) => {
    const fetchData = [];
    fs.createReadStream(filename)
      .pipe(csv.parse({ headers: isHeader === true }))
      .on('error', reject)
      .on('data', (row) => {
        fetchData.push(row);
      })
      .on('end', () => {
        resolve(fetchData);
      });
  });

const writeCSVData = (filename, data, isHeader) => {
  if (data.length === 0) return;
  let bytes = '';

  if (isHeader === true) {
    for (let j = 0; j < Object.keys(data[0]).length; j++) {
      if (j !== 0) bytes += ',';
      bytes += "\"" + Object.keys(data[0])[j] + "\"";
    }
    bytes += '\n';
  }

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    for (let j = 0; j < Object.keys(row).length; j++) {
      if (j !== 0) bytes += ',';
      bytes += "\"" + row[Object.keys(row)[j]] + "\"";
    }
    if (i !== data.length - 1) bytes += '\n';
  }
  fs.writeFileSync(filename, bytes);
};

module.exports = {
	uploadFile,
  writeCSVData,
  getCSVData,
  getTreeData,
  getFlatData
};
