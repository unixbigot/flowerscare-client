#!/usr/local/bin/node

const noble = require('@abandonware/noble');
const yargs = require('yargs');
const log4js = require('log4js');
const {Buffer} = require('buffer');
const logger = log4js.getLogger();
const util = require('util');
let search = ['Flowerscare'];

//logger.level = 'info';
const result = {};

const argv = yargs
      .option('list',{type:'boolean'})
      .option('dump',{type:'boolean'})
      .option('timeout',{type:'number', default:10})
      .option('expect',{type:'number', default:0})
      .option('notify',{type:'string', array:true, default:[]})
      .help()
      .alias('help', 'h')
      .argv;

logger.debug('Args parsed as ',argv)
if (argv._.length>0) {
    search = argv._
}
logger.debug('Set search to ',search)

function finish() {
    console.log(JSON.stringify(result,null,'    '))
    process.exit(0);
}

let timer
if (argv.timeout) {
    timer=setTimeout(()=>{
	logger.warn('Exiting due to timeout')
	finish()
    }, argv.timeout*1000)
}

const nobleDump = (msg,obj,func=logger.debug,that=logger) => func.call(that, msg, JSON.stringify(obj,(k,v)=>(k==='_noble'?undefined:v),'   '))

noble.on('stateChange', state=>{
    logger.info(`BLE state change ${state}`)
    if (state === 'poweredOn') {
	noble.startScanning()
    }
})

noble.on('discover', device=>{
    const banner = `${device.address} ${device.uuid} ${device.advertisement.localName||''}`
    if (argv.list) {
	console.log(banner)
    } else {
	logger.info(`Discovered ${banner}`)
    }
    if (search.find(d=>d===device.advertisement.localName || d===device.advertisement.uuid)) {
	if (argv.dump)
	    nobleDump('device', device, console.log, console)
	else
	    nobleDump('device', device, logger.debug)
	if (!argv.list) {
	    noble.stopScanning()
	    //if (timer) clearTimeout(timer)
	    pollDevice(device)
	}
    }
})

noble.on('scanStart', ()=>{
    logger.info('Scan started');
})

noble.on('scanStop', ()=>{
    logger.info('Scan stopped');
})

noble.on('warning', message=>{
    logger.warn(`noble warning`,message)
})


function pollDevice(device) {
    logger.info('Polling device ',device.uuid)

    device.once('connect', ()=>{

	logger.info('Device connected');

	device.once('disconnect', ()=>{
	    logger.info('Device disconnected');
	})

	device.discoverAllServicesAndCharacteristics(
	    (error, services, characteristics)=>{
		if (error) {
		    console.error('Service discovery failed', error)
		    return
		}
		logger.info('Service discovery complete')
		if (argv.dump) services.forEach(s=>nobleDump('service', s, console.log, console))
		nobleDump(`Discovered ${services.length} services`, services, logger.debug)
		logger.debug(`Discovered ${characteristics.length} characteristics`)

		if (argv.dump) characteristics.forEach(c=>nobleDump('characteristic', c, console.log, console))

		characteristics.forEach(characteristic=>{

		    logger.debug('Characteristic', characteristic)
		    if (!characteristic.name) {
			characteristic.name = characteristic.uuid
		    }

		    characteristic.discoverDescriptors((error, descriptors)=>{
			if (error) {
			    console.error('Descriptor discovery failed', error)
			    return
			}
			logger.debug(`Discovered ${descriptors.length} descriptors`, descriptors)
			if (argv.dump) descriptors.forEach(d=>nobleDump('descriptor', d, console.log, console))
			descriptors.forEach(descriptor=>{
			    if (descriptor.name === 'Characteristic User Description') {
				descriptor.readValue((error,data)=>{
				    if (error) {
					console.error('Descriptor read failed', error)
					return
				    }
				    const name = data.toString('utf8')
				    logger.info(`Characteristic ${characteristic.uuid} aka ${name}`)
				    characteristic.name = name
				})
			    }
			})

			logger.debug(`listen for data`)
			characteristic.on('data',data=>{
			    let value
			    logger.debug(`data callback for ${characteristic.name}`)
			    if (characteristic.name.endsWith(' Name') ||
				characteristic.name.endsWith(' String')) {
				value = data.toString('utf8')
			    }
			    else if (data.length == 2) {
				value = data.readUInt16LE()
			    }
			    else if (data.length == 4) {
				value = data.readUInt32LE()
			    }
			    else {
				value = util.inspect(data)
			    }
			    result[characteristic.name]=value
			    logger.info(`data value "${characteristic.name}": ${value}`)
			    if (argv.dump) console.log(`value ${characteristic.name}`, value)

			    if (characteristic.name === 'LED') {
				value = !value
				const buf = Buffer.alloc(2)
				buf.writeUInt16LE(value, 0)
				logger.info(`Inverting LED to ${value}`, buf)
				characteristic.write(buf, false, err=>{
				    if (err) {
					logger.error('Write error', err)
				    }
				    else {
					logger.info('Write succeeded')
				    }
				});
			    }

			    if (argv.expect && (Object.keys(result).length >= argv.expect)) {
				finish()
			    }
			})

			logger.debug(`handle notification changes`)
			characteristic.once('notify', state=>{
			    logger.info(`Characteristic ${characteristic.name} notify state ${state}`)
			})

			if (characteristic.properties.includes('read')) {
			    logger.info(`read characteristic ${characteristic.name}`)
			    characteristic.read((error,data)=>{
				if (error) {
				    logger.error(`Characteristic ${characteristic.name} read failed`, error)
				    return
				}
				//const value = data.readUInt16LE()
				//console.log(`${characteristic.name}: ${value}`)

			    })
			    logger.debug(`finished with ${characteristic.name}`)
			} // end if readable

			if (characteristic.properties.includes('notify')) {
			    if (argv.notify.find(
				f=> (f===characteristic.uuid) ||
				    (f===characteristic.name))) {
				logger.info(`subscribe to characteristic ${characteristic.uuid}`)
				characteristic.subscribe((error,data)=>{
				    if (error) {
					logger.error('subscribe error ', error)
					return
				    }
				    if (data) {
					logger.info('notify data',data)
				    }
				})
			    }
			    else {
				logger.debug(`not interested in notifications for ${characteristic.uuid}`)
				logger.debug(`we only stan`, argv.notify)
			    }
			}


		    }) // end descriptor discovery callback

		}) // end characteristic iteration callback

	    }) // end service discovery callback

    }) // end on-connect callback

    device.connect(err=>{
	if (err) {console.error('Connect failed', err)}
    })
} // end function pollFlowerscare
