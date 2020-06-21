const functions = require('firebase-functions');
const bodyparser = require('body-parser');
const cors = require('cors')
const admin = require('firebase-admin');
const express = require('express');
const app = express();
var serviceAccount = require('./admin');


app.use(cors({
    origin: true
}));
app.use(bodyparser.json());
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://notes-a06e0.firebaseio.com",
    authDomain: "notes-a06e0.firebaseapp.com",
});

async function updateNote(body) {
    const {
        uuid,
        title,
        content,
        note_id
    } =body;
    const ref = `users/${uuid}/notes/${note_id}`;
    let noteRef = admin.database().ref(ref);
    let data = {
        title: title,
        content: content
    };
    return await noteRef.set(data);
}

async function newNote(body) {
    const {
        uuid,
        title,
        content
    } = body;

    const ref = `users/${uuid}/notes/`
    const notesReference = admin.database().ref(ref);

    let newNote = notesReference.push()
    const data = {
        title: title,
        content: content
    };
    return newNote.update(data);
}

app.post("/api/save", async (req, res) => {
    try {
        const {
            uuid,
            note_id
        } = req.body;
        const ref = `users/${uuid}/notes/`
        const notesReference = admin.database().ref(ref);
        if (note_id) {
            let noteRef = notesReference.child(note_id);
            let node = await noteRef.once('value')
            if (node.exists()) {
                await updateNote(req.body);
                res.status(200).json({
                    success: true,
                    message: "Update Successfully"
                });
                return;
            }

        }
        await newNote(req.body);
        res.status(200).json({
            success: true,
            message: "Saved Successfully"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        })
    }


})

app.get("/api/notes", async (req, res) => {
    const uuid = req.query.uuid;
    console.log(uuid)
    try {
        const ref = `users/${uuid}/notes/`
        const notesRef = admin.database().ref(ref);
        notesRef.on('value', (dataSnapShot) => {
            const nodes = dataSnapShot.val();
            let notes = [];

            for (node in nodes) {
                notes.push({
                    note: nodes[node],
                    node_id: node
                })
            }
            console.log(notes);
            res.status(200).json({
                success: true,
                message: notes
            });
        })

    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }


})

app.post("/api/register", async (req, res) => {
    const db = admin.database();
    const userRef = db.ref("users");
    let uuid = req.body.uuid;
    let email = req.body.email;
    console.log("Registring for User ", email);
    const obj = {
        "user": email,
        "uuid": uuid,
        "notes": []
    }

    try {
        const snapshot = await userRef.once('value');
        if (snapshot.child(uuid.toString()).exists()) {
            res.status(500).json({
                "success": false,
                "message": "User already exists"
            })
        } else {
            console.log("No child found");
            var newuserRef = userRef.child(uuid);
            obj["uuid"] = newuserRef.key;
            newuserRef.update(obj, (error) => {
                if (error) {
                    res.status(500).json({
                        success: false,
                        message: "Failed Creating Node"
                    })
                } else {
                    res.status(200).json({
                        success: true,
                        message: "User created successfully"
                    });
                }
            })
        }

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message.toString()
        });
    }
})
app.get("/api/ping", (req, res) => {
    var db = admin.database();
    // var userRef = db.ref("users");

    res.status(200).json({
        "msg": "Ting!!"
    });

    // res.send("Ting!!!");
})
exports.app = functions.https.onRequest(app);