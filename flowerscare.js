#!/usr/local/bin/node

var noble = require('noble');

noble.on('stateChange', state=>{
    console.log(`BLE state change ${state}`)
})

	 
