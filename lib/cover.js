/*
Support for Elero cover components.
For more details about this component, please refer to the documentation
https){//home-assistant.io/components/cover.elero/
*/
/*
from homeassistant.components.cover import (ATTR_POSITION, ATTR_TILT_POSITION,
                                            SUPPORT_CLOSE, SUPPORT_CLOSE_TILT,
                                            SUPPORT_OPEN, SUPPORT_OPEN_TILT,
                                            SUPPORT_SET_POSITION,
                                            SUPPORT_SET_TILT_POSITION,
                                            SUPPORT_STOP, SUPPORT_STOP_TILT,
                                            CoverDevice)
from homeassistant.components.light import PLATFORM_SCHEMA
from homeassistant.const import (CONF_COVERS, CONF_DEVICE_CLASS, CONF_NAME,
                                 STATE_CLOSED, STATE_CLOSING, STATE_OPEN,
                                 STATE_OPENING, STATE_UNKNOWN)

import custom_components.elero as elero
from custom_components.elero import (CONF_TRANSMITTER_SERIAL_NUMBER,
                                     INFO_BLOCKING,
                                     INFO_BOTTOM_POS_STOP_WICH_INT_POS,
                                     INFO_BOTTOM_POSITION_STOP,
                                     INFO_INTERMEDIATE_POSITION_STOP,
                                     INFO_MOVING_DOWN, INFO_MOVING_UP,
                                     INFO_NO_INFORMATION, INFO_OVERHEATED,
                                     INFO_START_TO_MOVE_DOWN,
                                     INFO_START_TO_MOVE_UP,
                                     INFO_STOPPED_IN_UNDEFINED_POSITION,
                                     INFO_SWITCHING_DEVICE_SWITCHED_OFF,
                                     INFO_SWITCHING_DEVICE_SWITCHED_ON,
                                     INFO_TILT_VENTILATION_POS_STOP,
                                     INFO_TIMEOUT,
                                     INFO_TOP_POS_STOP_WICH_TILT_POS,
                                     INFO_TOP_POSITION_STOP,
                                     RESPONSE_LENGTH_INFO,
                                     RESPONSE_LENGTH_SEND)
*/
//Python libraries/modules that you would normally install for your component.
REQUIREMENTS = []

//Other HASS components that should be setup before the platform is loaded.
DEPENDENCIES = ['elero']

POSITION_CLOSED = 0
POSITION_INTERMEDIATE = 25
POSITION_UNDEFINED = 50
POSITION_TILT_VENTILATION = 75
POSITION_OPEN = 100

ATTR_ELERO_STATE = 'elero_state'

//Should be if the transmitter bug is corrected.
CONF_CHANNELS = 'channels'
//It is needed because of the transmitter has a channel handling bug.

ELERO_COVER_DEVICE_CLASSES_SCHEMA = vol.All(vol.Lower,
                                            vol.In(ELERO_COVER_DEVICE_CLASSES))

CONF_SUPPORTED_FEATURES = 'supported_features'

SUPPORTED_FEATURES = {
    'up'){ SUPPORT_OPEN,
    'down'){ SUPPORT_CLOSE,
    'stop'){ SUPPORT_STOP,
    'set_position'){ SUPPORT_SET_POSITION,
    'open_tilt'){ SUPPORT_OPEN_TILT,
    'close_tilt'){ SUPPORT_CLOSE_TILT,
    'stop_tilt'){ SUPPORT_STOP_TILT,
    'set_tilt_position'){ SUPPORT_SET_TILT_POSITION,
}

SUPPORTED_FEATURES_SCHEMA = vol.All(cv.ensure_list,
                                    [vol.In(SUPPORTED_FEATURES)])

//Should be if the transmitter bug is corrected.
CHANNEL_NUMBERS_SCHEMA = vol.All(cv.ensure_list,
                                 [vol.Range(min=1, max=15)])

//It is needed because of the transmitter has a channel handling bug.
CHANNEL_NUMBERS_SCHEMA = vol.All(vol.Coerce(int), vol.Range(min=1, max=15))

//Validation of the user's configuration
COVER_SCHEMA = vol.Schema({
    vol.Required(CONF_TRANSMITTER_SERIAL_NUMBER)){ str,
    vol.Required(CONF_NAME)){ str,
    vol.Required(CONF_CHANNEL)){ CHANNEL_NUMBERS_SCHEMA,
    vol.Required(CONF_DEVICE_CLASS)){ ELERO_COVER_DEVICE_CLASSES_SCHEMA,
    vol.Required(CONF_SUPPORTED_FEATURES)){ SUPPORTED_FEATURES_SCHEMA,
})

class EleroCover(){
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
        this._position = None;
        this._set_position = None;
        this._is_opening = None;
        this._is_closing = None;
        this._closed = None;
        this._tilt_position = None;
        this._set_tilt_position = None;
        this._state = None;
        this._elero_state = None;
        this._response = dict();
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
        //Return True if entity has to be polled for state.
        Because of you can use other remote control (like MultiTel2)
        next to the HA in your system and the status of the Elero devices
        may change therefore it is necessary to monitor their statuses.
        //
        return True;
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
        data = {};

        elero_state = this._elero_state;
        if(elero_state is not None){
            data[ATTR_ELERO_STATE] = this._elero_state;
        }
        return data;
    }

    update(){
        //Get the device sate and update its attributes and state.
        this._transmitter.info(this._channel);
        this.request_response(RESPONSE_LENGTH_INFO);
    }

    close_cover(){
        //Close the cover.
        this._transmitter.down(this._channel);
        this.request_response(RESPONSE_LENGTH_SEND);
    }
  
    open_cover(){
        //Open the cover.
        this._transmitter.up(this._channel);
        this.request_response(RESPONSE_LENGTH_SEND);
    }

    stop_cover(){
        //Stop the cover.
        this._transmitter.stop(this._channel);
        this.request_response(RESPONSE_LENGTH_SEND);
    }

    set_cover_position(position){
        //Move the cover to a specific position.
        this._set_position = round(position, -1);
        console.log("Elero - transmitter){ '"+this._transmitter.get_serial_number()+"' ch){ '"+this._channel+"' "
                        "The set cover position function is "
                        "not implemented yet.");
    }

    close_cover_tilt(){
        //Close the cover tilt.
        this._transmitter.intermediate(this._channel);
        this.request_response(RESPONSE_LENGTH_SEND);
    }

    open_cover_tilt(){
        //Open the cover tilt.
        this._transmitter.ventilation_tilting(this._channel);
        this.request_response(RESPONSE_LENGTH_SEND);
    }

    stop_cover_tilt(){
        //Stop the cover tilt.
        this._transmitter.stop(this._channel);
        this.request_response(RESPONSE_LENGTH_SEND);
    }

    set_cover_tilt_position(tilt_position){
        //Move the cover tilt to a specific position.
        this._set_tilt_position = round(tilt_position, -1);
        this.log.warn("Elero - transmitter '"+this._transmitter.get_serial_number()+"' ch '"+this._channel' "
                        "The set cover tilt position function is "
                        "not implemented yet.");
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
        if(this._response['status'] == INFO_NO_INFORMATION){
            this._closed = None;
            this._is_closing = None;
            this._is_opening = None;
            this._position = None;
            this._tilt_position = None;
            this._state = STATE_UNKNOWN;
        //INFO_TOP_POSITION_STOP
        }else if(this._response['status'] == INFO_TOP_POSITION_STOP){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_OPEN;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPEN;
        //INFO_BOTTOM_POSITION_STOP
        }else if(this._response['status'] == INFO_BOTTOM_POSITION_STOP){
            this._closed = True;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_CLOSED;
            this._tilt_position = POSITION_CLOSED;
            this._state = STATE_CLOSED;
        //INFO_INTERMEDIATE_POSITION_STOP
        }else if(this._response['status'] == INFO_INTERMEDIATE_POSITION_STOP){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_INTERMEDIATE;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPEN;
        //INFO_TILT_VENTILATION_POS_STOP
        }else if(this._response['status'] == INFO_TILT_VENTILATION_POS_STOP){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_TILT_VENTILATION;
            this._tilt_position = STATE_OPEN;
            this._state = STATE_OPEN;
        //INFO_START_TO_MOVE_UP
        }else if(this._response['status'] == INFO_START_TO_MOVE_UP){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = True;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPENING;
        //INFO_START_TO_MOVE_DOWN
        }else if(this._response['status'] == INFO_START_TO_MOVE_DOWN){
            this._closed = False;
            this._is_closing = True;
            this._is_opening = False;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_CLOSING;
        //INFO_MOVING_UP
        }else if(this._response['status'] == INFO_MOVING_UP){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = True;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPENING;
        //INFO_MOVING_DOWN
        }else if(this._response['status'] == INFO_MOVING_DOWN){
            this._closed = False;
            this._is_closing = True;
            this._is_opening = False;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_CLOSING;
        //INFO_STOPPED_IN_UNDEFINED_POSITION
        }else if(this._response['status'] == INFO_STOPPED_IN_UNDEFINED_POSITION){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_UNDEFINED;
            this._tilt_position = POSITION_UNDEFINED;
            this._state = STATE_OPEN;
        //INFO_TOP_POS_STOP_WICH_TILT_POS
        }else if(this._response['status'] == INFO_TOP_POS_STOP_WICH_TILT_POS){
            this._closed = False;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_OPEN;
            this._tilt_position = POSITION_OPEN;
            this._state = STATE_OPEN;
        //INFO_BOTTOM_POS_STOP_WICH_INT_POS
        }else if(this._response['status'] == INFO_BOTTOM_POS_STOP_WICH_INT_POS){
            this._closed = True;
            this._is_closing = False;
            this._is_opening = False;
            this._position = POSITION_CLOSED;
            this._tilt_position = POSITION_CLOSED;
            this._state = STATE_CLOSED;
        //INFO_BLOCKING,INFO_OVERHEATED,INFO_TIMEOUT
        }else if(this._response['status'] in (INFO_BLOCKING, INFO_OVERHEATED,
                                          INFO_TIMEOUT)){
            this._closed = None;
            this._is_closing = None;
            this._is_opening = None;
            this._position = None;
            this._tilt_position = None;
            this._state = STATE_UNKNOWN;
            console.log("Elero - transmitter '"+this._transmitter.get_serial_number()+"' channel '"+this._channel+"' "
                            "Error response '"+this._response['status']+"'.");
        //INFO_SWITCHING_DEVICE_SWITCHED_ON, INFO_SWITCHING_DEVICE_SWITCHED_OFF
        }else if(this._response['status'] in (
                INFO_SWITCHING_DEVICE_SWITCHED_ON,
                INFO_SWITCHING_DEVICE_SWITCHED_OFF)){
            this._closed = None;
            this._is_closing = None;
            this._is_opening = None;
            this._position = None;
            this._tilt_position = None;
            this._state = STATE_UNKNOWN;
        }else{
            this._closed = None;
            this._is_closing = None;
            this._is_opening = None;
            this._position = None;
            this._tilt_position = None;
            this._state = STATE_UNKNOWN;
                       console.log("Elero - transmitter '"+this._transmitter.get_serial_number()+"' channel '"+this._channel+"' "
                            "Unhandled response '"+this._response['status']+"'.");
        }
    }
}
