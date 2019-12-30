#!/usr/local/bin/node

var noble = require('noble');

noble.on('stateChange', state=>{
    console.log(`BLE state change ${state}`)
    if (state === 'poweredOn') {
	noble.startScanning()
    }
})

noble.on('discover', device=>{
    console.log(`Device ${device.address} ${device.uuid} discovered`, device.advertisement.localName)
    if (device.advertisement.localName === 'Flowerscare') {
	noble.stopScanning()
	pollFlowerscare(device)
    }
})

noble.on('scanStart', ()=>{
    console.log('Scan started');
})

noble.on('scanStop', ()=>{
    console.log('Scan stopped');
})
	 
noble.on('warning', message=>{
    console.log(`noble warning`,message)
})


function pollFlowerscare(device) {
    console.log('Polling flowerscare device',device)
    device.once('connect', ()=>{
	console.log('Flowerscare connected');
	device.discoverAllServicesAndCharacteristics(
	    (error, services, characteristics)=>{
		if (error) {
		    console.error('Discovery failed', error)
		    return
		}
		console.log(`Discovered ${services.length} services`, services)
		console.log(`Discovered ${characteristics.length} characteristics`)
		characteristics.forEach(characteristic=>{
		    console.log('Characteristic', characteristic)
		    characteristic.discoverDescriptors((error, descriptors)=>{
			if (error) {
			    console.error('Descriptor discovery failed', error)
			    return
			}
			console.log(`Discovered ${descriptors.length} descriptors`, descriptors)
			descriptors.forEach(descriptor=>{
			    if (descriptor.name === 'Characteristic User Description') {
				descriptor.readValue((error,data)=>{
				    if (error) {
					console.error('Descriptor read failed', error)
					return
				    }
				    const name = data.toString('utf8')
				    console.log(`Characteristic name ${name}`)

				    characteristic.on('data',(data,isNotification)=>{
					const value = data.readUInt16LE()
					console.log(`${name} ${value}`)
				    })

				    characteristic.once('notify', state=>{
					console.log(`Characteristic ${name} notify state ${state}`)
				    })
				    
				    characteristic.read((error,data)=>{
					if (error) {
					    console.error(`Characteristic ${name} read failed`, error)
					    return
					}
				    })

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
	
