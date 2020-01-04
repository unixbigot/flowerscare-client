#!/usr/local/bin/node

const noble = require('@abandonware/noble');
const log4js = require('log4js');
const logger = log4js.getLogger();
let devices = ['Flowerscare'];

logger.level = 'info';
const expect = 4;
const result = {};

if (process.argv.length>2) {
    devices = process.argv.slice(2)
}

const nobleDump = (msg,obj,func=logger.debug) => func.call(logger, msg, JSON.stringify(obj,(k,v)=>(k==='_noble'?undefined:v),'   '))

noble.on('stateChange', state=>{
    logger.info(`BLE state change ${state}`)
    if (state === 'poweredOn') {
	noble.startScanning()
    }
})



noble.on('discover', device=>{
    logger.info(`Discovered ${device.address} ${device.uuid} ${device.advertisement.localName||''}`)
    //nobleDump('Device', device.advertisement, logger.info)
    nobleDump('Device', device, logger.info)
    if (devices.find(d=>d===device.advertisement.localName || d===device.advertisement.uuid)) {
	noble.stopScanning()
	pollFlowerscare(device)
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


function pollFlowerscare(device) {
    nobleDump('Polling flowerscare device',device,logger.info)
    device.once('connect', ()=>{
	logger.info('Flowerscare connected');
	device.once('disconnect', ()=>{
	    logger.info('Flowerscare disconnected');
	})

	device.discoverAllServicesAndCharacteristics(
	    (error, services, characteristics)=>{
		if (error) {
		    console.error('Discovery failed', error)
		    return
		}
		nobleDump(`Discovered ${services.length} services`, services, logger.debug)
		logger.debug(`Discovered ${characteristics.length} characteristics`)
		characteristics.forEach(characteristic=>{
		    logger.debug('Characteristic', characteristic)
		    characteristic.discoverDescriptors((error, descriptors)=>{
			if (error) {
			    console.error('Descriptor discovery failed', error)
			    return
			}
			logger.debug(`Discovered ${descriptors.length} descriptors`, descriptors)
			descriptors.forEach(descriptor=>{
			    if (descriptor.name === 'Characteristic User Description') {
				descriptor.readValue((error,data)=>{
				    if (error) {
					console.error('Descriptor read failed', error)
					return
				    }
				    const name = data.toString('utf8')
				    logger.info(`Characteristic ${characteristic.uuid} aka ${name}`)

				    logger.debug(`listen for data`)
				    characteristic.on('data',data=>{
					const value = data.readUInt16LE()
					result[name]=value
					logger.info(`"${name}": ${value}`)
					if (Object.keys(result).length === expect) {
					    console.log(JSON.stringify(result,null,'    '))
					    process.exit(0);
					}
				    })

				    logger.debug(`handle notification changes`)
				    characteristic.once('notify', state=>{
					logger.info(`Characteristic ${name} notify state ${state}`)
				    })

				    /*
				    logger.debug(`enable notifications`)
				    characteristic.subscribe(error=>{
					logger.error('subscribe error ', error)
				    })
				    */
				    
				    logger.debug(`read characteristic`)
				    characteristic.read((error,data)=>{
					if (error) {
					    logger.error(`Characteristic ${name} read failed`, error)
					    return
					}
					//const value = data.readUInt16LE()
					//console.log(`${name}: ${value}`)

				    })
				    logger.debug(`finished with ${name}`)
				})
			    }
			})

		    })

		})
	    })

    })
    device.connect(err=>{
     if (err) {console.error('Connect failed', err)}
    })
}
	
logger.warn('we are so done')
