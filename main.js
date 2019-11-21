'use strict';

/*
 * Created with @iobroker/create-adapter v1.17.0
 */

// The adapter-core module gives you access to the core ioBroker functions
// you need to create an adapter
const utils = require('@iobroker/adapter-core');
const adapterName = require('./io-package.json').common.name;

// Load your modules here, e.g.:
// const fs = require("fs");
///const EleroLib = require(__dirname + '/lib/elero-io.js');
///const CoverLib = require(__dirname + '/lib/cover.js');

let adapter;
let ETrans;
let ETran;
let Channels;
var Devices = {};

class Elero extends utils.Adapter {

    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    constructor(options) {
        super({
            ...options, 
            name: adapterName
        });
        this.on('ready', this.onReady.bind(this));
        this.on('objectChange', this.onObjectChange.bind(this));
        this.on('stateChange', this.onStateChange.bind(this));
        // this.on('message', this.onMessage.bind(this));
        this.on('unload', this.onUnload.bind(this));
    }

    /**
     * Is called when databases are connected and adapter received configuration.
     */
    async onReady() {
        // Initialize your adapter here

        // The adapters config (in the instance object everything under the attribute "native") is accessible via
        // this.config:
        this.log.info('config option1: ' + this.config.option1);
        this.log.info('config option2: ' + this.config.option2);

        //this.log.debug("Creating Transmitters Class");
        //ETrans = new ETrans(this.config);
        //ETrans.discover();
        //ETran = ETrans.get_first_transmitter();
        //if (!ETran.get_transmitter_state()){
        //    this.log.warn("No usable Transmitter found in Transmitters-list!");
        //    break;
        //}else{
        //    //Transmitter active and channels learned
        //    //- list Channels
        //    Channels = ETran.get_learned_channels();
        //    Channels.foreach( function(ch) {
        //        //set channel-object
        //        /*
        //        setObject(ch.toString, {
        //              common: {
        //                    name: ch.toString();
        //              },
        //              type: 'channel'
        //        });
        //        */
                
        //        //register Covvers
        //        Devices[ch] = new CoverLib(ETran,'',ch,{'up','down','stop','set_position','open_tilt','close_tilt','stop_tilt','set_tilt_position'});
        //        Devices[ch].update();
        //        //set Device tree
        //        setState(ch.toString,'available', Devices[ch].available());
        //        setState(ch.toString,'name', Devices[ch].name());
        //        setState(ch.toString,'device_class', Devices[ch].device_class());
        //        setState(ch.toString,'supported_features', Devices[ch].supported_features());
        //        setState(ch.toString,'is_opening', Devices[ch].current_cover_position());
        //        setState(ch.toString,'is_closing', Devices[ch].current_cover_position());
        //        setState(ch.toString,'is_closed', Devices[ch].current_cover_position());
        //        setState(ch.toString,'current_cover_position', Devices[ch].current_cover_position());
        //        setState(ch.toString,'position', Devices[ch].is_closing());
        //        setState(ch.toString,'tilt_position', Devices[ch].is_closing());
        //        setState(ch.toString,'state', Devices[ch].is_closing());
        //        setState(ch.toString,'_command', '');
        //    });
            
        //    //- register to Covers
        //    //#todo: irgendwie muss dann da alles unter einen channel. 
        //    //-connect Covers to states
        //}
        

        // in this template all states changes inside the adapters namespace are subscribed
        this.subscribeStates('*');

        /*
        setState examples
        you will notice that each setState will cause the stateChange event to fire (because of above subscribeStates cmd)
        */
        // the variable testVariable is set to true as command (ack=false)
        await this.setStateAsync('testVariable', true);

        // same thing, but the value is flagged "ack"
        // ack should be always set to true if the value is received from or acknowledged from the target system
        await this.setStateAsync('testVariable', { val: true, ack: true });

        // same thing, but the state is deleted after 30s (getState will return null afterwards)
        await this.setStateAsync('testVariable', { val: true, ack: true, expire: 30 });

        // examples for the checkPassword/checkGroup functions
        let result = await this.checkPasswordAsync('admin', 'iobroker');
        this.log.info('check user admin pw ioboker: ' + result);

        result = await this.checkGroupAsync('admin', 'admin');
        this.log.info('check group user admin group admin: ' + result);
    }

    /**
     * Is called when adapter shuts down - callback has to be called under any circumstances!
     * @param {() => void} callback
     */
    onUnload(callback) {
        try {
            this.log.info('cleaned everything up...');
             ETrans.close_transmitters();
            callback();
        } catch (e) {
            callback();
        }
    }

    /**
     * Is called if a subscribed object changes
     * @param {string} id
     * @param {ioBroker.Object | null | undefined} obj
     */
    onObjectChange(id, obj) {
        if (obj) {
            // The object was changed
            this.log.info(`object ${id} changed: ${JSON.stringify(obj)}`);
        } else {
            // The object was deleted
            this.log.info(`object ${id} deleted`);
        }
    }

    /**
     * Is called if a subscribed state changes
     * @param {string} id
     * @param {ioBroker.State | null | undefined} state
     */
    onStateChange(id, state) {
        if (state) {
            // The state was changed
            this.log.info(`state ${id} changed: ${state.val} (ack = ${state.ack})`);
            
            if(state.toString().length == 0){break}
            
            var statearray = id.split(".");
            var statename = statearray[statearray.length-1];
            var channel = statearray[statearray.length-2];
            switch(statename){
                case "_command":
                    //Kommando ausführen
                    switch(state.toLowerCase()){
                        case "open_cover":
                            Devices[channel].open_cover();
                            //fast update until opened/stopped?
                            break;
                        case "close_cover":
                            Devices[channel].close_cover();
                            //fast update until opened/stopped?
                            break;
                        case "stop_cover":
                            Devices[channel].stop_cover();
                            //fast update until opened/stopped?
                            break;
                        default:
                            this.log.error("No valid command given: '"+state+"');
                    }
                    break;
            }
            setState(id,"");
        } else {
            // The state was deleted
            this.log.info(`state ${id} deleted`);
        }
    }

    // /**
    //  * Some message was sent to this instance over message box. Used by email, pushover, text2speech, ...
    //  * Using this method requires "common.message" property to be set to true in io-package.json
    //  * @param {ioBroker.Message} obj
    //  */
    // onMessage(obj) {
    // 	if (typeof obj === 'object' && obj.message) {
    // 		if (obj.command === 'send') {
    // 			// e.g. send email or pushover or whatever
    // 			this.log.info('send command');

    // 			// Send response in callback if required
    // 			if (obj.callback) this.sendTo(obj.from, obj.command, 'Message received', obj.callback);
    // 		}
    // 	}
    // }

}

// @ts-ignore parent is a valid property on module
if (module.parent) {
    // Export the constructor in compact mode
    /**
     * @param {Partial<ioBroker.AdapterOptions>} [options={}]
     */
    var options = options || {};
    module.exports = (options) => new Elero(options);
} else {
    // otherwise start the instance directly
    new Elero();
}
