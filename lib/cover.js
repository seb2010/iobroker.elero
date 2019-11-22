/*
Support for Elero cover components.
For more details about this component, please refer to the documentation
https){//home-assistant.io/components/cover.elero/
*/
/*

from homeassistant.components.light import PLATFORM_SCHEMA
from homeassistant.const import (CONF_COVERS, CONF_DEVICE_CLASS, CONF_NAME,
                                 STATE_CLOSED, STATE_CLOSING, STATE_OPEN,
                                 STATE_OPENING, STATE_UNKNOWN)
*/
let elero = require('./elero-io.js');

const POSITION_CLOSED = 0
const POSITION_INTERMEDIATE = 25
const POSITION_UNDEFINED = 50
const POSITION_TILT_VENTILATION = 75
const POSITION_OPEN = 100

const ATTR_ELERO_STATE = 'elero_state'

//Should be if the transmitter bug is corrected.
const CONF_CHANNELS = 'channels'
//It is needed because of the transmitter has a channel handling bug.

const CONF_SUPPORTED_FEATURES = 'supported_features'

var SUPPORTED_FEATURES = {
    'up': true,
    'down': true,
    'stop': true,
    'set_position': true,
    'open_tilt': true,
    'close_tilt': true,
    'stop_tilt': true,
    'set_tilt_position': true,
}

class EleroCover{
    //Representation of a Elero cover device.

    constructor(transmitter, name, channel, supported_features){
        //Init of a Elero cover.
        this._transmitter = transmitter;
        this._name = name;
        this._channel = channel;
        this._device_class = 'window';

        this._supported_features = 0;
        supported_features.foreach( function(f) {
            this._supported_features |= SUPPORTED_FEATURES[f];
        });
      
        this._available = this._transmitter.set_channel(this._channel, this.response_handler);
        this._position = undefined;
        this._set_position = undefined;
        this._is_opening = undefined;
        this._is_closing = undefined;
        this._closed = undefined;
        this._tilt_position = undefined;
        this._set_tilt_position = undefined;
        this._state = undefined;
        this._elero_state = undefined;
        this._response = {};
    }
  
    get name(){
        //Return the name of the cover.
        return this._name;
    }

    get device_class(){
        //Return the class of this device, from component DEVICE_CLASSES.
        return this._device_class;
    }

    get supported_features(){
        //Flag supported features.
        return this._supported_features;
    }

    get should_poll(){
        /*Return True if entity has to be polled for state.
        Because of you can use other remote control (like MultiTel2)
        next to the HA in your system and the status of the Elero devices
        may change therefore it is necessary to monitor their statuses.
        */
        return true;
    }

    get available(){
        //Return True if entity is available.
        return this._available;
    }

    get current_cover_position(){
        /*Return the current position of the cover.
        None is unknown, 0 is closed, 100 is fully open.
        */
        return this._position;
    }

    get current_cover_tilt_position(){
        //Return the current tilt position of the cover.
        return this._tilt_position;
    }

    get is_opening(){
        //Return if the cover is opening or not.
        return this._is_opening;
    }

    get is_closing(){
        //Return if the cover is closing or not.
        return this._is_closing;
    }

    get is_closed(){
        //Return if the cover is closed.
        return this._closed;
    }

    get state(){
        //Return the state of the cover.
        return this._state;
    }

    get device_state_attributes(){
        //Return device specific state attributes.
        var data = {};

        var elero_state = this._elero_state;
        if(!elero_state.isundefined()){
            data[ATTR_ELERO_STATE] = this._elero_state;
        }
        return data;
    }

    update(){
        //Get the device sate and update its attributes and state.
        this._transmitter.info(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_INFO);
    }

    close_cover(){
        //Close the cover.
        this._transmitter.down(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_SEND);
    }
  
    open_cover(){
        //Open the cover.
        this._transmitter.up(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_SEND);
    }

    stop_cover(){
        //Stop the cover.
        this._transmitter.stop(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_SEND);
    }

    set_cover_position(position){
        //Move the cover to a specific position.
        this._set_position = Math.round(position);
        this.log.warn("Elero - transmitter: '"+this._transmitter.get_serial_number()+"' ch: '"+this._channel+"' The set cover position function is not implemented yet.");
    }

    close_cover_tilt(){
        //Close the cover tilt.
        this._transmitter.intermediate(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_SEND);
    }

    open_cover_tilt(){
        //Open the cover tilt.
        this._transmitter.ventilation_tilting(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_SEND);
    }

    stop_cover_tilt(){
        //Stop the cover tilt.
        this._transmitter.stop(this._channel);
        this.request_response(elero.RESPONSE_LENGTH_SEND);
    }

    set_cover_tilt_position(tilt_position){
        //Move the cover tilt to a specific position.
        this._set_tilt_position = Math.round(tilt_position);
        this.log.warn("Elero - transmitter '" + this._transmitter.get_serial_number() + "' ch '" + this._channel + "' The set cover tilt position function is not implemented yet.");
    }

    request_response(resp_length){
        //Set state variables based on device response.
        this._transmitter.get_response(resp_length, this._channel);
    }
    
    response_handler(response){
        //Callback function to the response from the Transmitter.
        this._response = response;
        this.set_states();
        this.schedule_update_ha_state();
    }
  
    set_states(){
        this._elero_state = this._response['status'];
        // INFO_NO_INFORMATION
        if (this._response['status'] == elero.INFO_NO_INFORMATION){
            this._closed = null;
            this._is_closing = null;
            this._is_opening = null;
            this._position = null;
            this._tilt_position = null;
            this._state = elero.STATE_UNKNOWN;
        //INFO_TOP_POSITION_STOP
        } else if (this._response['status'] == elero.INFO_TOP_POSITION_STOP){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_OPEN;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPEN;
        //INFO_BOTTOM_POSITION_STOP
        } else if (this._response['status'] == elero.INFO_BOTTOM_POSITION_STOP){
            this._closed = true;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_CLOSED;
            this._tilt_position = POSITION_CLOSED;
            this._state = STATE_CLOSED;
        //INFO_INTERMEDIATE_POSITION_STOP
        } else if (this._response['status'] == elero.INFO_INTERMEDIATE_POSITION_STOP){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_INTERMEDIATE;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPEN;
        //INFO_TILT_VENTILATION_POS_STOP
        } else if (this._response['status'] == elero.INFO_TILT_VENTILATION_POS_STOP){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_TILT_VENTILATION;
            this._tilt_position = elero.STATE_OPEN;
            this._state = elero.STATE_OPEN;
        //INFO_START_TO_MOVE_UP
        } else if (this._response['status'] == elero.INFO_START_TO_MOVE_UP){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = true;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = elero.STATE_OPENING;
        //INFO_START_TO_MOVE_DOWN
        } else if (this._response['status'] == elero.INFO_START_TO_MOVE_DOWN){
            this._closed = false;
            this._is_closing = true;
            this._is_opening = false;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = elero.STATE_CLOSING;
        //INFO_MOVING_UP
        } else if (this._response['status'] == elero.INFO_MOVING_UP){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = true;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = elero.STATE_OPENING;
        //INFO_MOVING_DOWN
        } else if (this._response['status'] == elero.INFO_MOVING_DOWN){
            this._closed = false;
            this._is_closing = true;
            this._is_opening = false;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = elero.STATE_CLOSING;
        //INFO_STOPPED_IN_UNDEFINED_POSITION
        } else if (this._response['status'] == elero.INFO_STOPPED_IN_UNDEFINED_POSITION){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_UNDEFINED;
            this._state = STATE_OPEN;
        //INFO_TOP_POS_STOP_WICH_TILT_POS
        } else if (this._response['status'] == elero.INFO_TOP_POS_STOP_WICH_TILT_POS){
            this._closed = false;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_OPEN;
            this._tilt_position = POSITION_OPEN;
            this._state = elero.STATE_OPEN;
        //INFO_BOTTOM_POS_STOP_WICH_INT_POS
        } else if (this._response['status'] == elero.INFO_BOTTOM_POS_STOP_WICH_INT_POS){
            this._closed = true;
            this._is_closing = false;
            this._is_opening = false;
            this._position = POSITION_CLOSED;
            this._tilt_position = POSITION_CLOSED;
            this._state = elero.STATE_CLOSED;
        //INFO_BLOCKING,INFO_OVERHEATED,INFO_TIMEOUT
        } else if ([elero.INFO_BLOCKING, elero.INFO_OVERHEATED, elero.INFO_TIMEOUT].some(str => str in this._response['status'])){
            this._closed = null;
            this._is_closing = null;
            this._is_opening = null;
            this._position = null;
            this._tilt_position = null;
            this._state = elero.STATE_UNKNOWN;
            this.log.error("Elero - transmitter '"+this._transmitter.get_serial_number()+"' channel '"+this._channel+"' Error response '"+this._response['status']+"'.");
        //INFO_SWITCHING_DEVICE_SWITCHED_ON, INFO_SWITCHING_DEVICE_SWITCHED_OFF
        } else if ([elero.INFO_SWITCHING_DEVICE_SWITCHED_ON, elero.INFO_SWITCHING_DEVICE_SWITCHED_OFF].some(str => str in this._response['status'])){
            this._closed = null;
            this._is_closing = null;
            this._is_opening = null;
            this._position = null;
            this._tilt_position = null;
            this._state = elero.STATE_UNKNOWN;
        }else{
            this._closed = null;
            this._is_closing = null;
            this._is_opening = null;
            this._position = null;
            this._tilt_position = null;
            this._state = elero.STATE_UNKNOWN;
            this.log.error("Elero - transmitter '"+this._transmitter.get_serial_number()+"' channel '"+this._channel+"' Unhandled response '"+this._response['status']+"'.");
        }
    }
}
