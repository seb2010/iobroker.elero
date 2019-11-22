/*
Support for Elero electrical drives.
For more details about this platform, please refer to the documentation at
https://home-assistant.io/components/elero/
*/
//#todo: import logging

//#todo: import homeassistant.helpers.config_validation as cv
//#todo: import serial
//#todo: import voluptuous as vol
//#todo: from homeassistant.const import EVENT_HOMEASSISTANT_STOP
//#todo: from serial.tools import list_ports

// Python libraries/modules that you would normally install for your component.
var serialport = require("serialport"); 

// The domain of your component. Equal to the filename of your component.
var DOMAIN = 'elero';

// The connected Transmitter devices.
let ELERO_TRANSMITTERS ;

// Configs to the serial connection.
const CONF_TRANSMITTERS = 'transmitters';
const CONF_TRANSMITTER_SERIAL_NUMBER = 'serial_number';
const CONF_BAUDRATE = 'baudrate';
const CONF_BYTESIZE = 'bytesize';
const CONF_PARITY = 'parity';
const CONF_STOPBITS = 'stopbits';

// Default serial info
const DEFAULT_BRAND = 'elero';
const DEFAULT_PRODUCT = 'Transmitter Stick';

// Default serial connection details.
const DEFAULT_BAUDRATE = 38400;
const DEFAULT_BYTESIZE = 8;
const DEFAULT_PARITY = "none";
const DEFAULT_STOPBITS = 1;

// values to bit shift.
const HEX_255 = 0xFF;
const BIT_8 = 8;

// Header for all command.
const BYTE_HEADER = 0xAA;
// command lengths
const BYTE_LENGTH_2 = 0x02;
const BYTE_LENGTH_4 = 0x04;
const BYTE_LENGTH_5 = 0x05;

// Wich channels are learned.
const COMMAND_CHECK = 0x4A;
// required response lenth.
const RESPONSE_LENGTH_CHECK = 6;
// The Playload will be send to all channel with bit set.
const COMMAND_SEND = 0x4C;
// required response lenth.
const RESPONSE_LENGTH_SEND = 7;
// Get the status or position of the channel.
const COMMAND_INFO = 0x4E;
// Required response lenth.
const RESPONSE_LENGTH_INFO = 7;
// for Serial error handling
const NO_SERIAL_RESPONSE = '';

// Playloads to send.
const PAYLOAD_STOP = 0x10;
const PAYLOAD_STOP_TEXT = "stop";
const PAYLOAD_UP = 0x20;
const PAYLOAD_UP_TEXT = "up";
const PAYLOAD_VENTILATION_POS_TILTING = 0x24;
const PAYLOAD_VENTILATION_POS_TILTING_TEXT = "ventilation position/tilting";
const PAYLOAD_DOWN = 0x40;
const PAYLOAD_DOWN_TEXT = "down";
const PAYLOAD_INTERMEDIATE_POS = 0x44;
const PAYLOAD_INTERMEDIATE_POS_TEXT = "intermediate position/tilting";

// Info to receive response.
const INFO_UNKNOWN = "unknown response";
const INFO_NO_INFORMATION = "no information";
const INFO_TOP_POSITION_STOP = "top position stop";
const INFO_BOTTOM_POSITION_STOP = "bottom position stop";
const INFO_INTERMEDIATE_POSITION_STOP = "intermediate position stop";
const INFO_TILT_VENTILATION_POS_STOP = "tilt ventilation position stop";
const INFO_BLOCKING = "blocking";
const INFO_OVERHEATED = "overheated";
const INFO_TIMEOUT = "timeout";
const INFO_START_TO_MOVE_UP = "start to move up";
const INFO_START_TO_MOVE_DOWN = "start to move down";
const INFO_MOVING_UP = "moving up";
const INFO_MOVING_DOWN = "moving down";
const INFO_STOPPED_IN_UNDEFINED_POSITION = "stopped in undefined position";
const INFO_TOP_POS_STOP_WICH_TILT_POS = "top position stop wich is tilt position";
const INFO_BOTTOM_POS_STOP_WICH_INT_POS = "bottom position stop wich is intermediate position";
const INFO_SWITCHING_DEVICE_SWITCHED_OFF = "switching device switched off";
const INFO_SWITCHING_DEVICE_SWITCHED_ON = "switching device switched on";

const INFO = {0x00: INFO_NO_INFORMATION,
        0x01: INFO_TOP_POSITION_STOP,
        0x02: INFO_BOTTOM_POSITION_STOP,
        0x03: INFO_INTERMEDIATE_POSITION_STOP,
        0x04: INFO_TILT_VENTILATION_POS_STOP,
        0x05: INFO_BLOCKING,
        0x06: INFO_OVERHEATED,
        0x07: INFO_TIMEOUT,
        0x08: INFO_START_TO_MOVE_UP,
        0x09: INFO_START_TO_MOVE_DOWN,
        0x0A: INFO_MOVING_UP,
        0x0B: INFO_MOVING_DOWN,
        0x0D: INFO_STOPPED_IN_UNDEFINED_POSITION,
        0x0E: INFO_TOP_POS_STOP_WICH_TILT_POS,
        0x0F: INFO_BOTTOM_POS_STOP_WICH_INT_POS,
        0x10: INFO_SWITCHING_DEVICE_SWITCHED_OFF,
        0x11: INFO_SWITCHING_DEVICE_SWITCHED_ON,
        };

/*
ELERO_TRANSMITTER_SCHEMA = vol.Schema({
    vol.Optional(CONF_TRANSMITTER_SERIAL_NUMBER): str,
    vol.Optional(CONF_BAUDRATE, default=DEFAULT_BAUDRATE): cv.positive_int,
    vol.Optional(CONF_BYTESIZE, default=DEFAULT_BYTESIZE): cv.positive_int,
    vol.Optional(CONF_PARITY, default=DEFAULT_PARITY): str,
    vol.Optional(CONF_STOPBITS, default=DEFAULT_STOPBITS): cv.positive_int,
});*/

class EleroTransmitters{
    //Container for the Elero Centero USB Transmitter Sticks.
    constructor(adapter, config){
		//Initialize the usb sticks.
        this.config = config;
        this._adapter = adapter;
        this.transmitters = {};
	}
	
    async discover(){
		//Discover the connected Elero Transmitter Sticks.
		//#todo: change to serialport-function references
        var i = 0;
        var ports = await serialport.list();
        this._adapter.log.debug("Discovery->Ports: " + JSON.stringify(ports));
        for (var port in ports) {
            i++;
            this._adapter.log.debug("Discovery->Testing Port: "+JSON.stringify(ports[port]));
            if (DEFAULT_BRAND in ports[port]['manufacturer'] && DEFAULT_PRODUCT in ports[port]['product']) {
                this._adapter.log.debug("Discovery->Result: an Elero Transmitter Stick is found on port: '" + ports[port]['path'] + "'" + " with serial number: '" + port.serialNumber + "'");

                let baudrate;
                let bytesize;
                let parity;
                let stopbits;

                if (ports[port]['serialNumber'] in this.config) {
                    baudrate = this.config[ports[port]['serialNumber']].get(CONF_BAUDRATE);
                    bytesize = this.config[ports[port]['serialNumber']].get(CONF_BYTESIZE);
                    parity = this.config[ports[port]['serialNumber']].get(CONF_PARITY);
                    stopbits = this.config[ports[port]['serialNumber']].get(CONF_STOPBITS);
                } else {
                    baudrate = DEFAULT_BAUDRATE;
                    bytesize = DEFAULT_BYTESIZE;
                    parity = DEFAULT_PARITY;
                    stopbits = DEFAULT_STOPBITS;
                }

                this._adapter.log.debug("Discovery: Initializing Transmitter '" + ports[port]['serialNumber'] + "' at Port: '" + ports[port]['name'] + "'");
                var elero_transmitter = new EleroTransmitter(this._adapter, ports[port]['path'], baudrate, bytesize, parity, stopbits);

                if (elero_transmitter.get_transmitter_state()) {
                    this._adapter.log.debug("Discovery: Transmitter '" + ports[port]['serialNumber'] + "' initialized");
                    if (!(String(ports[port]['serialNumber']) in this.transmitters)) {
                        this.transmitters[ports[port]['serialNumber']] = elero_transmitter;
                        this._adapter.log.info("Discovery: '" + ports[port]['serialNumber'] + "' transmitter added to pool");
                    } else {
                        this._adapter.log.debug("Discovery: '" + ports[port]['serialNumber'] + "' transmitter is already added!");
                    }
                }
            } else {
                this._adapter.log.debug("Discovery->Result: " + ports[port]['path'] + " is not an Elero Transmitter Stick"); 
            }
        };
        this._adapter.log.debug("Disvovery: "+ i.toString() + " Port(s) scanned");
	}

	get_first_transmitter(){
		//returns the first transmitter
		this.transmitters.foreach(function(t) {
			if(t.get_transmitter_state()){
				return t;
			}
		});	
	}
			
	get_transmitter(serialNumber){
		//Return the given transmitter.
        if (serialNumber in this.transmitters){
		    return this.transmitters[serialNumber];
		}else{
		    this._adapter.log.debug("Elero - the transmitter '"+serialNumber+"' is not exist!");
		    return null;
		}
	}
	
    close_transmitters(){
        //Close the serial connection of the transmitters.
		this.transmitters.foreach(function(t) {
			t.close();
		});
	}
}

class EleroTransmitter{
    //Representation of an Elero Centero USB Transmitter Stick.

    	constructor(adapter, serial_port, baudrate, bytesize, parity, stopbits){
		//Initialization of a elero transmitter.
            this._adapter = adapter;
            this.serial_port = serial_port;
		    this._serial_number = this.serial_port.serialNumber;
		    this._port = serial_port.path;
            this._baudrate = baudrate;
		    this._bytesize = bytesize;
		    this._parity = parity;
		    this._stopbits = stopbits;
		    //setup the serial connection to the transmitter
		    this._serial = null;
		    this._init_serial();
		    //get the learned channels from the transmitter
		    this._learned_channels = {};
		    if(this._serial){
		    this.check();
		}
	}

    _init_serial(){
		//Init the serial port to the transmitter.
		//#todo: richtig über serialport initialisieren
		try{
			this._serial = new serialport(this._port, {
				    baudRate: this._baudrate,
				    dataBits: this._bytesize,
				    parity: this._parity,
				    stopBits: this._stopbits
			});
			this._serial.open();
        	}
		catch(exc){
            		this._adapter.log.debug("Elero - unable to open serial port for '"+this._serial_number+"' to the Transmitter Stick: "+exc.toString());
		}
	}
	
    log_out_serial_port_details(){
		//Log out the details of the serial connection.
		//#todo: serialport details 
		var details = this.serial_port.toString();
		this._adapter.log.debug("Elero - transmitter stick on port '"+this._port+"' details: '"+details+"'.");
	}
	
    close_serial(){
		//Close the serial connection of the transmitter.
		this._serial.close();
	}
	
    get_transmitter_state(){
		//The transmitter is usable or not.
		return this._serial;
	}
	
    get_serial_number(){
		//Return the ID of the transmitter.
		return this._serial_number
	}
	
    _get_check_command(){
		//Create a hex list to Check command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_2,
			    COMMAND_CHECK];
		return int_list;
	}
	
    check(){
		//Wich channels are learned.
		//Should be received an answer "Easy Confirm" with in 1 second.
		//
		this._send_command(this._get_check_command(), 0);
		var ser_resp = this._read_response(RESPONSE_LENGTH_CHECK, 0);
		if(ser_resp){
		    var resp = this._parse_response(ser_resp, 0);
		    this._learned_channels = Object.keys(resp['chs']);
		    this._adapter.log.debug("The taught channels on the '"+this._serial_number+"' transmitter are '"+this._learned_channels.join(" ")+"'.");
		}
	}
	
    get_learned_channels(){
		//Return all learned Channels
		return this._learned_channels;
	}
	
    set_channel(channel, obj){
		//Set the channel if it is learned.
		if(channel in this._learned_channels){
		    this._learned_channels[channel] = obj
		    return true;
		}else{
		    this._adapter.log.debug("The '"+channel+"' channel is not taught to the '"+this._serial_number+"' transmitter.");
		    return false;
		}
	}
	
    _get_info_command(channel) {
        //Create a hex list to the Info command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_4,
			    COMMAND_INFO,
			    this._set_upper_channel_bits(channel),
			    this._set_lower_channel_bits(channel)];
		return int_list;
	}
	
    info(channel){
		//Return the current state of the cover.
		//Should be received an answer "Easy Act" with in 4 seconds.
		//
		this._send_command(this._get_info_command(channel), channel);
	}
	
    _get_up_command(channel){
		//Create a hex list to Open command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_5,
			    COMMAND_SEND,
			    this._set_upper_channel_bits(channel),
			    this._set_lower_channel_bits(channel),
			    PAYLOAD_UP];
		return int_list;
	}
	
    up(channel){
		//Open the cover.
		//Should be received an answer "Easy Act" with in 4 seconds.
		//
		this._send_command(this._get_up_command(channel), channel);
	}
	
    _get_down_command(channel){
		//Create a hex list to Close command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_5,
			    COMMAND_SEND,
			    this._set_upper_channel_bits(channel),
			    this._set_lower_channel_bits(channel),
			    PAYLOAD_DOWN];
		return int_list;
	}
	
    down(channel){
		//Close the cover.
		//Should be received an answer "Easy Act" with in 4 seconds.
		//
		this._send_command(this._get_down_command(channel), channel);
	}
	
    get_stop_command(channel){
		//Create a hex list to the Stop command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_5,
			    COMMAND_SEND,
			    this._set_upper_channel_bits(channel),
			    this._set_lower_channel_bits(channel),
			    PAYLOAD_STOP];
		return int_list;
	}
	
    stop(channel){
		//Stop the cover.
		//Should be received an answer "Easy Act" with in 4 seconds.
		//
		this._send_command(this._get_stop_command(channel), channel);
	}
	
    get_intermediate_command(channel){
		//Create a hex list to the intermediate command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_5,
			    COMMAND_SEND,
			    this._set_upper_channel_bits(channel),
			    this._set_lower_channel_bits(channel),
			    PAYLOAD_INTERMEDIATE_POS];
		return int_list;
	}
	
    intermediate(channel){
		//Set the cover in intermediate position.
		//Should be received an answer "Easy Act" with in 4 seconds.
		//
		this._send_command(this._get_intermediate_command(channel), channel);
	}
	
    _get_ventilation_tilting_command(channel){
		//Create a hex list to the ventilation command.
		var int_list = [BYTE_HEADER, BYTE_LENGTH_5,
			    COMMAND_SEND,
			    this._set_upper_channel_bits(channel),
			    this._set_lower_channel_bits(channel),
			    PAYLOAD_VENTILATION_POS_TILTING];
		return int_list;
	}

    ventilation_tilting(channel){
		//Set the cover in ventilation position.
		//Should be received an answer "Easy Act" with in 4 seconds.
		//
		this._send_command(this._get_ventilation_tilting_command(channel),
				   channel);
	}
	
    _read_response(resp_length, channel){
		//Get the serial data from the serial port.
			//'todo: serialport response reading
		if(!this._serial.isOpen()){
		    this._serial.open();
		}
		var ser_resp = this._serial.read(resp_length);
		this._adapter.log.debug("Elero - transmitter: '"+this._serial_number+"' ch: '"+channel+"' serial response: '"+ser_resp+"'.");
		return ser_resp;
	}
	
    _parse_response(ser_resp, channel) {
        //Parse the serial data as a response
        //#todo: serialport response reading
        var response = {
            'bytes': None,
            'header': None,
            'length': None,
            'command': None,
            'ch_h': None,
            'ch_l': None,
            'chs': set(),
            'status': None,
            'cs': None,
        };
    
	    response['bytes'] = ser_resp;
		//No response or serial data
		if("ser_resp"){
		    response['status'] = INFO_NO_INFORMATION;
		    return;
		}
		var resp_length = ser_resp.length();
		//Common parts
		response['header'] = ser_resp[0];
		response['length'] = ser_resp[1];
		response['command'] = ser_resp[2];
		response['ch_h'] = this._get_upper_channel_bits(ser_resp[3]);
		response['ch_l'] = this._get_lower_channel_bits(ser_resp[4]);
		response['chs'] = new Set(response['ch_h'] + response['ch_l']);
		//Easy Confirmed (the answer on Easy Check)
		if(resp_length == RESPONSE_LENGTH_CHECK){
		    response['cs'] = ser_resp[5];
		//Easy Ack (the answer on Easy Info)
		}else if(resp_length == RESPONSE_LENGTH_SEND){
		   	 if(ser_resp[5] in INFO){
				response['status'] = INFO[ser_resp[5]];
		   	 }else{
				response['status'] = INFO_UNKNOWN;
				this._adapter.log.debug("Elero - transmitter: '"+this._serial_number+"' ch: '"+channel+"' status is unknown: '"+ser_resp[5]+"'.");
			}
		    response['cs'] = ser_resp[6];
		}else{
		    this._adapter.log.debug("Elero - transmitter: '"+this._serial_number+"' ch: '"+channel+"' unknown response: '"+ser_resp+"'.");
		    response['status'] = INFO_UNKNOWN;
		}
		return response;
	}
	
    get_response(resp_length, channel){
		//Read the response form the device.
		var ser_resp = this._read_response(resp_length, channel);
		var resp = this._parse_response(ser_resp, channel);
		//no meaningful response
		if(resp['status'] == INFO_NO_INFORMATION){
		    return;
		}
		//reply to the appropriate channel
		if(resp['chs'].length() == 1){
			var ch = resp['chs'].pop()
			//call back the channel with its result
			if(ch in this._learned_channels){
				this._learned_channels[ch](resp);
			}else{
				this._adapter.log.debug("Elero - no matched channel '"+ch+"'.");
			}
		}else{
            this._adapter.log.debug("Elero - more than one channel in the response: '"+resp+"'.");
		}
	}
	
    _send_command(int_list, channel){
		//Write out a command to the serial port.
		int_list.append(this._calculate_checksum(int_list));
		var bytes_data = this._create_serial_data(int_list);
		this._adapter.log.debug("Elero - transmitter: '"+this._serial_number+"' ch: '"+channel+"' serial command: '"+bytes_data+"'.");
		if(!this._serial.isOpen()){
		    this._serial.open();
		}
		this._serial.write(bytes_data);
	}
	
	_calculate_checksum(args){
		//Calculate checksum.
		//All the sum of all bytes (Header to CS) must be 0x00.
		//
        var argsSum = args => args.reduce((a, b) => a + b, 0)
        return (256 - Number(argsSum)) % 256;
	}

    _create_serial_data(int_list){
		//Convert integers to bytes for serial communication.
		var bytes_data = Buffer.from(int_list);
		return bytes_data;
	}
	
    _set_upper_channel_bits(channel){
		//Set upper channel bits, for channel 9 to 15.
		var res = (1 << (channel-1)) >> BIT_8;
		return res;
	}
	
    _set_lower_channel_bits(channel){
		//Set lower channel bits, for channel 1 to 8.
		var res = (1 << (channel-1)) & HEX_255;
		return res;
	}
	
    _get_upper_channel_bits(byt){
		//The set channel numbers from 9 to 15.
        var channels = {};
        let ch;
        [...Array(9).keys()].forEach(function (i) {
            if (((byt >> i) & 1) == 1) {
                ch = i + 9;
                channels.push(ch);
            }
        });
    	return channels;
	}
	
    _get_lower_channel_bits(byt){
		//The set channel numbers from 1 to 8.
        var channels = {};
        let ch;
        [...Array(9).keys()].forEach(function (i) {
            if (((byt >> i) & 1) == 1) {
                ch = i + 1;
                channels.push(ch);
            }
        });
		return channels;
	}
}

module.exports = {
    CONF_TRANSMITTER_SERIAL_NUMBER,
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
    RESPONSE_LENGTH_SEND,
    EleroTransmitters,
    EleroTransmitter
};