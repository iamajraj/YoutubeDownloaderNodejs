const fs = require('fs');
const listr = require('listr');
const axios = require('axios');
const arg = require('arg');
const colorprint = require('colorprint');
const path = require('path');

const API_GET_INFO =
  'https://ab.cococococ.com/ajax/download.php?copyright=0&format=1080&api=dfcb6d76f2f6a9894gjkege8a4ab232222&url=';
const API_GET_DOWN_URL = 'https://p.oceansaver.in/ajax/progress.php?id=';

let ytInfo = null;

function getInfo(ytUrl) {
  return async () => {
    const response = await axios.get(API_GET_INFO + ytUrl);
    return new Promise((resolve, reject) => {
      if (response.status === 200) {
        const data = response.data;
        if (data?.success) {
          ytInfo = {
            id: data.id,
            title: data?.info?.title,
            image: data?.info?.image,
          };
          resolve();
        } else {
          reject(new Error('Failed to get the info from the youtube video'));
        }
      } else {
        reject(new Error('Failed to get the info from the youtube video'));
      }
    });
  };
}

async function downloadVideo(_, task) {
  const downloadFile = ytInfo.title.replaceAll(' ', '_') + '.mp4';
  const downloadPath = path.resolve(__dirname, 'media', downloadFile);
  const response = await axios.get(API_GET_DOWN_URL + ytInfo.id);

  task.title = `Downloading ${ytInfo.title}`;

  return new Promise(async (resolve, reject) => {
    if (response.status === 200) {
      const data = response.data;
      if (data?.success) {
        const downloadUrl = data.download_url;
        const dResponse = await axios.get(downloadUrl, {
          responseType: 'stream',
          onDownloadProgress: (progressEvent) => {
            let percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            task.title = `Downloading ${ytInfo.title} (${percentCompleted}%)`;
          },
        });

        dResponse.data.pipe(fs.createWriteStream(downloadPath));
        dResponse.data.on('end', () => {
          resolve();
        });
        dResponse.data.on('error', () => {
          reject(new Error('Failed to download the video'));
        });
      } else {
        reject(new Error('Failed to get the video download url'));
      }
    } else {
      reject(new Error('Failed to get the video download url'));
    }
  });
}

async function main() {
  const args = arg({
    '--url': String,

    '-u': '--url',
  });

  if (!args['--url']) {
    colorprint.fatal('* --url is required');
    process.exit(1);
  }

  const ytUrl = args['--url'];

  const tasks = new listr([
    {
      title: 'Getting the youtube video info',
      task: getInfo(ytUrl),
    },
    {
      title: 'Downloading the video',
      task: downloadVideo,
    },
  ]);

  tasks
    .run()
    .then(() => {
      process.exit(0);
    })
    .catch(() => process.exit(1));
}

main();
