Push notifications are a powerful and free browser feature that is often overlooked by products due to the complexity of service workers and the backend infra required to send notifications.

In this post we will discuss how to implement you own push notification service that will scale as you grow.

We will use service workers and AWS lambda functions to send notifications to a site saved as a PWA on the users phone

## Demo

Here is a demo of what we are building:

## Implementation

For this service we are using AWS lambda and deploying via the serverless framework. You can deploy this type of application in any kind of backend but I prefer the pay per execution model of the AWS serverless offerings.

### Frontend setup

Our frontend will be a debugger to test our push notification service.

<!-- doc-gen CODE src="https://github.com/DavidWells/saaslayer/blob/master/services/push-service/debugger/index.html" -->
```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Web Push Demo</title>
    <meta name="description" content="Web Push Demo">
    <link rel="manifest" href="/manifest.json">
    <link rel="stylesheet" href="./assets/paper.min.css">
    <link rel="stylesheet" href="./assets/style.css">
  </head>
  <body>
    <div class="background"></div>
    <div class="paper content">
      <h2 class="heading">
        <span>
          Web Push Debugger
        </span>
        <div class="status">
          <p>
            Push supported: <u><strong id="push-notification-supported">true</strong></u>
          </p>
          <p>
            User consent: <u><strong id="push-notification-consent">granted</strong></u>
          </p>
        </div>
      </h2>

      <div class='debugger'>
        <div class='trigger'>
            <div>
              <h4>step 1: Ask user consent to show notifications</h4>
              <button id="ask-user-permission-button">Ask user permission</button>
            </div>
            <div>
              <h4>step 2: Subscribe to push notification</h4>
              <p>this will create an endpoint that has to be sent to the push server</p>
              <button id="create-notification-subscription-button">Create notification subscription</button>
            </div>
            <div>
              <h4>step 3: Send notification</h4>
              <p>Fire push notification from server</p>
              <form id="send-push-form">
                <div>
                  <input name="title" value="Message Title" placeholder="Message Title" type="text" required="">
                </div>
                <div>
                  <input name="body" value="Message Body" placeholder="Message Body" type="text" required="">
                </div>
                <div>
                  <input name="data" value='{ "foo": "bar" }'  placeholder="Custom Data" type="text">
                </div>
                <!-- <div>
                  <input name="delay" placeholder="Number of seconds to delay" type="text">
                </div> -->
                <textarea name="subs" id="user-susbription"></textarea>
                <input id="send-push-notification-button" type="submit" value="Send a push notification 🚀">
              </form>
            </div>
        </div>
        <div class='response'>
          <h3>Web Push Custom Data:</h3>
          <textarea 
            placeholder="Push notification response data... This is shown when notification is clicked" 
            id="web-notification"
            class="web-notification"
            disabled
          ></textarea>
        </div>
      </div>
  
    </div>
    <script src="./assets/app.js" type="module"></script>
  </body>
</html>
```
<!-- end-doc-gen -->

Backend setup

<!-- doc-gen CODE src="https://github.com/DavidWells/saaslayer/blob/master/services/push-service/handler.js" -->
```js
const fs = require('fs')
const querystring = require('querystring')
const webPush = require('web-push');

if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
  console.log("You must set the VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY " +
    "environment variables. You can use the following ones:");
  console.log(webPush.generateVAPIDKeys());
}

webPush.setVapidDetails(
  process.env.VAPID_DOMAIN || process.env.VAPID_CONTACT,
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

function response(statusCode, body, file) {
  let payload = {
    statusCode,
    // api gateway cors headers
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: typeof (body) === 'string' ? body : JSON.stringify(body, null, 2)
  };
  console.log('RESPOND', payload);
  return payload;
}

module.exports.vapidPublicKey = async () => {
  return response(200, process.env.VAPID_PUBLIC_KEY);
};

// module.exports.register = async (event, context) => {
//   // Save the registered users subscriptions (event.body)
//   await addSubscription(JSON.parse(event.body));
//   return response(201, event);
// };

// async function getSubscriptions() {
//   const s = await s3.getObject({ Bucket: process.env.STATE_BUCKET, Key: 'subscriptions'}).promise();
//   return JSON.parse(s.Body.toString("utf-8"));
// }

// async function addSubscription(subscription) {
//   let subscriptions = await getSubscriptions();
//   console.log(subscriptions);
//   let uniq = {};
//   for (let i=0; i < subscriptions.length; i++){
//     uniq[subscriptions[i].endpoint] = subscriptions[i];
//   }
//   uniq[subscription.endpoint] = subscription; // use latest for endpoint
//   await s3.putObject({
//     Bucket: process.env.STATE_BUCKET,
//     Key: 'subscriptions',
//     Body: JSON.stringify(Object.values(uniq)),
//     ContentType: 'application/json'
//   }).promise();
// }

// TODO remove stale subscriptions 

function send(subscriptions, payload, options, delay) {
  console.log('send', subscriptions, payload, options, delay);
  const payload_string = typeof (payload) === 'string' ? payload : JSON.stringify(payload)

  return new Promise((success) => {
    setTimeout(() => {

      Promise.all(subscriptions.map((each_subscription) => {
        console.log('sending each_subscription', each_subscription)
        console.log('Message', payload_string)
        return webPush.sendNotification(each_subscription, payload_string, options);
      }))
        .then(function () {
          success(response(201, {}));
        }).catch(function (error) {
          console.log('ERROR>', error);
          success(response(500, { error: error }));
        });

    }, 1000 * parseInt(delay));
  });
}

function decodeURLSearchParams(params) {
  const decodedParams = {};
  for (const [key, value] of params) {
    decodedParams[key] = decodeURIComponent(value);
  }
  return decodedParams;
}

function decodeForm(formData) {
    // Parse the form data
    const decodedFormData = {};
    const pairs = formData.split('&');
    pairs.forEach(pair => {
        const [key, value] = pair.split('=');
        const decodedKey = decodeURIComponent(key);
        let decodedValue;
        try {
            // Try parsing the value as JSON
            decodedValue = JSON.parse(decodeURIComponent(value));
        } catch (error) {
            // If parsing fails, assume regular URL-encoded value
            decodedValue = decodeURIComponent(value);
        }
        decodedFormData[decodedKey] = decodedValue;
    });
    return decodedFormData;
}

module.exports.debugger = async (event) => {
  console.log('register event', JSON.stringify(event, null, 2));
  // const data = decodeForm(event.body);

  const data = querystring.parse(event.body);
  const payloadData = typeof (data.data) === 'string' ? JSON.parse(data.data) : data.data

  const payload = JSON.stringify({
    title: data.title,
    body: data.body,
    data: {
      ...payloadData,
      debuggerTimestamp: Date.now(),
    },
  })

  const options = {
    TTL: data.ttl | 5
  };

  const delay = (data.delay) ? parseInt(data.delay, 10) : 1;

  const subData = JSON.parse(data.subs)
  console.log('subData', subData)
  return await send([subData], payload, options, delay);
};

module.exports.sendNotification = async (event) => {
  console.log('register event', JSON.stringify(event, null, 2));
  let body = JSON.parse(event.body);
  const subscription = body.subscription;
  const payload = body.payload;
  const delay = body.delay;
  const options = {
    TTL: body.ttl | 5
  };

  return await send([subscription], payload, options, delay);
};

// module.exports.registerOrSendToAll = async (event) => {
//   if (event.resource === '/register') {
//     await addSubscription(JSON.parse(event.body).subscription);
//     return response(201, event);
//   } else {
//     console.log('register event', JSON.stringify(event, null, 2));
//     let body = JSON.parse(event.body);
//     console.log('got body', body);
//     const payload = body.payload;
//     const delay = body.delay;
//     const options = {
//       TTL: body.ttl | 5
//     };
//     const subscriptions = await getSubscriptions();
//     return await send(subscriptions, payload, options, delay);
//   }

// };

// module.exports.notifyNewOrChanged = async (event) => {
//   //console.log('Received event:', JSON.stringify(event));
//   let message = null;
//   for (let i = 0; i < event.Records.length; i++) {
//     const r = event.Records[i];
//     switch (r.EventSource) {
//       case 'aws:sns':
//         message = JSON.parse(r.Sns.Message);
//         if (message.hasOwnProperty("Records")) {
//           const r = message.Records[0];
//           if (r.s3.object.key.startsWith('schedule')) {
//             console.log(r.s3.object.key);
//           } else {
//             await handle_appw(r);
//           }
//         } else {
//           console.log('unrecognised SNS message',message);
//         }
//         break;
//       default:
//       	console.log('Received unknown event:', JSON.stringify(r));
//     }
//   }
//   return `Successfully processed \${event.Records.length} messages.`;
// };

// async function handle_appw(message) {
//   //console.log('handle_appw', JSON.stringify(message));
//   const path = message.s3.object.key.split("/");
//   let pid = null;
//   let entity_type = null;
//   let doc = null;
//   if (message.s3.bucket.name==='ws-partners-appw-merge-test') {
//     entity_type = path[1];
//     pid = path[2].split('.')[1];
//     const r = await s3.getObject({ Bucket: message.s3.bucket.name, Key: message.s3.object.key }).promise();
//     doc = JSON.parse(r.Body.toString("utf-8"));
//   } else {
//     entity_type = path[4];
//     pid = path[5].split('.')[1];
//     doc = await get_appw(message.s3.bucket.name, message.s3.object.key);
//   }
//   switch (entity_type) {
//     case 'clip':
//     case 'episode':
//       {
//         const entity = doc.pips[entity_type];
//         //console.log(JSON.stringify(entity));
//         if(entity.hasOwnProperty('languages')) {
//           const lang = entity.languages.language[0].$;
//           if(lang===process.env.LANG) {
//             const payload = {
//               msg: `new or changed \${entity_type} \${pid}`,
//               pid: pid,
//               entity_type: entity_type,
//               entity: entity
//             };
//             console.log(`new or changed \${entity_type} \${pid}`);
//             const subscriptions = await getSubscriptions();
//             await send(subscriptions, payload, { TTL: 5 }, 0);
//           }
//         }
//       }
//       break;
      
//     case 'availability':      // safe to ignore, but should we even be getting them here?
//     case 'brand':
//     case 'series':
//       break;
      
//     default:
//       console.log(JSON.stringify(doc));
//   }
// }

// async function get_appw(bucket, key) {
//   console.log('get_appw', bucket, key);
//   const appw = await sts
//     .assumeRole({
//       RoleArn: process.env.APPW_ROLE,
//       RoleSessionName: "dazzler-test"
//     })
//     .promise();

//   const appwS3 = new aws.S3({
//     accessKeyId: appw.Credentials.AccessKeyId,
//     secretAccessKey: appw.Credentials.SecretAccessKey,
//     sessionToken: appw.Credentials.SessionToken
//   });
//   try {
//     const appw_doc = await appwS3
//       .getObject({ Bucket: bucket, Key: key })
//       .promise();
//     return JSON.parse(appw_doc.Body.toString("utf-8"));
//   }
//   catch(error) {
//     return null;
//   }
// }

module.exports.statics = async (event) => {
  // Serve static files from lambda (only for simplicity of this example)
  var file = fs.readFileSync(`./static\${event.resource}`);
  return await response(200, file.toString(), event.resource.split('/')[1]);
};
```
<!-- end-doc-gen -->

Infrastructure as code

Productionizing

In the demo we are utilizing dynamoDB and scan operations to fetch the list of subscriptions to send notifications to. This works okay to start out but eventually you may want to optimize this with a slightly different data model, especially if you have multiple different channels the users can subscribe to.

Wrapping up

Here is a link to the GitHub repo that includes the source code to this post.