module.exports = function (RED) {
    "use strict";
    var hikvision = require('node-hikvision-api');

    function CameraNode(n) {
        var node = this;

        // Create a RED node
        RED.nodes.createNode(this, n);

        var camera = null;
        
        if (camera) camera = null;

            camera = new hikvision.hikvision({
            host: n.host,
            port: n.port,
            user: node.credentials.username,
            pass: node.credentials.password,
            log: n.log
        });

        this.users = {};

        this.register = function(alarmNode){
            node.users[alarmNode.id] = alarmNode;
        };

        this.deregister = function(alarmNode,done){
            delete node.users[alarmNode.id];
            if (node.closing) {
                return done();
            }
            done();
        };

        camera.on('alarm', function (code, action, index) {
            // node.log('Received alarm from hikvision camera [' + n.host + ':' + n.port + ']: Code [' + code + '] action [' + action + '] index [' + index + ']');

            for (var id in node.users) {
                if (node.users.hasOwnProperty(id)) {
                    node.users[id].send({
                        'topic': node.name,
                        'payload': {
                            'code': code,
                            'action': action,
                            'index': index
                        }
                    })
                }
            }            
        });

        // Callback on connect
        camera.on('connect', function() {  
            node.log('Connected to hikvision camera [' + n.host + ':' + n.port + ']');
        });

        // Callback on error
        camera.on('error', function(error) {  
            node.log('Error connecting to hikvision camera [' + n.host + ':' + n.port + ']: ' + error);
        });

        // respond to inputs....
        this.on('input', function (msg) {
            var payload = msg.payload;

            // node.send(msg);
        });

        this.on('close', function (done) {
            node.log('Hikvision received request to close');
            if (camera) camera.close();
            camera = null;
            done();
        });
    }

    RED.nodes.registerType('hikvision-camera', CameraNode, {
        credentials: {
            username: {
                type: 'text'
            },
            password: {
                type: 'password'
            }
        }
    });

    function AlarmNode(config) {
        RED.nodes.createNode(this, config);

        var node = this;

        node.name = config.name;

        node.cameraId = config.camera;

        node.camera = RED.nodes.getNode(node.cameraId);
        
        node.camera.register(node);

        node.on('close', function (done) {
            node.camera.deregister(node,done);
        });
    }

    RED.nodes.registerType('hikvision-alarm', AlarmNode);

};