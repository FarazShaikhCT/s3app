require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const app = express();
const upload = multer({ dest: 'uploads/' });
const fs = require('fs'); 

// Create DynamoDB service object
const dynamoDB = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

// Parameters for the operation
const params = {
    TableName: 'testing',
    Key: {
        'random': { S: 'ExampleValue' }
    }
};

// Retrieve an item from DynamoDB
dynamoDB.getItem(params, (err, data) => {
    if (err) {
        console.log("Error", err);
    } else {
        console.log("Success", data.Item);
    }
});


// Configure AWS
const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    region: process.env.AWS_REGION
});

// Serve static files
app.use(express.static('public'));

// Upload a file to S3
app.post('/upload', upload.single('file'), (req, res) => {
    const file = req.file;
    const s3FileURL = `https://${process.env.S3_BUCKET}.s3.amazonaws.com/`;

    let s3bucket = new AWS.S3({
        params: { Bucket: process.env.S3_BUCKET }
    });

    let params = {
        Bucket: process.env.S3_BUCKET,
        Key: file.originalname,
        Body: fs.readFileSync(file.path),
        ContentType: file.mimetype
    };

    s3bucket.upload(params, function(err, data) {
        if (err) {
            console.log('error in callback');
            console.log(err);
            res.status(500).send("Error -> " + err);
        }
        console.log('success');
        console.log(data);
        res.send({ data: data, url: s3FileURL + file.originalname });
    });
});

// List files from S3
app.get('/files', (req, res) => {
    let params = {
        Bucket: process.env.S3_BUCKET
    };

    s3.listObjectsV2(params, function(err, data) {
        if (err) {
            console.log('error in callback');
            console.log(err);
            res.status(500).send("Error -> " + err);
        }
        const files = data.Contents.map(file => {
            const url = s3.getSignedUrl('getObject', {
                Bucket: process.env.S3_BUCKET,
                Key: file.Key,
                Expires: 60 * 5 // URL expires in 5 minutes
            });
            return {
                key: file.Key,
                size: file.Size,
                lastModified: file.LastModified,
                url: url
            };
        });

        res.send(files);
    });
});

const port = 3000;
app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});
