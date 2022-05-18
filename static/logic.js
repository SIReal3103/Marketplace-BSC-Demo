Moralis.initialize("rJCnBjAseEGv8ghCDEJpf1WiOP062ZqU4OAjocCF"); // Application id from moralis.io
Moralis.serverURL = "https://tr9nbsbndgef.usemoralis.com:2053/server"; //Server url from moralis.io
Moralis.start({ serverUrl: "https://tr9nbsbndgef.usemoralis.com:2053/server", appId: "rJCnBjAseEGv8ghCDEJpf1WiOP062ZqU4OAjocCF"});

const nft_market_place_address = "0x8996edC87B57B2a0FFa7367eB87AbE66630AF522" //NFT Market Place Contract, code of this contract is in the following github repository https://github.com/DanielMoralisSamples/25_NFT_MARKET_PLACE. 
const nft_contract_address = "0x6a90Fbeb99f164D33851762A9c2827D998B472F0"

const web3 = new Web3(window.ethereum);

Moralis.authenticate().then(function(){
    populateNFTs();
    populateOfferings();
    populateBalance();
    subscribeOfferings();
    subscribeBuys();
    subscribeUpdateNFTs();
});

async function login(){
    document.getElementById('submit').setAttribute("disabled", null);
    document.getElementById('username').setAttribute("disabled", null);
    document.getElementById('useremail').setAttribute("disabled", null);
    Moralis.Web3.authenticate().then(function (user) {
        user.set("name",document.getElementById('username').value);
        user.set("email",document.getElementById('useremail').value);
        user.save();
        document.getElementById("upload").removeAttribute("disabled");
        document.getElementById("file").removeAttribute("disabled");
        document.getElementById("name").removeAttribute("disabled");
        document.getElementById("description").removeAttribute("disabled");
    })
  }

//Real Time Updates
async function subscribeOfferings(){
    let query = new Moralis.Query("PlacedOfferings");
    subscriptionAlerts = await query.subscribe();
    subscriptionAlerts.on('create', (object) => {
        cleanOfferings();
        populateOfferings();
    });
}

async function subscribeBuys(){
    let query = new Moralis.Query("ClosedOfferings");
    subscriptionAlerts = await query.subscribe();
    subscriptionAlerts.on('create', (object) => {
        cleanOfferings();
        populateOfferings();
        populateBalance();
    });
}

async function subscribeUpdateNFTs(){
    let query = new Moralis.Query("PlacedOfferings");
    subscriptionAlerts = await query.subscribe();
    subscriptionAlerts.on('update', (object) => {
        console.log("New offer");
        cleanNFTList();
        populateNFTs();
    });
}

//Display Balance Functions
async function getBalance(_address){
    const params =  {address: _address}
    const balance = await Moralis.Cloud.run("getBalance", params);
    return(balance);
}

async function populateBalance(){
    //const presentBalance = await getBalance(ethereum.selectedAddress);
    const formatedBalance = "Your Balance is " + "0" + " ETH"
    document.getElementById("balance").innerHTML = formatedBalance;
}

// mint NFT

async function upload(){
    const fileInput = document.getElementById("file");
    const data = fileInput.files[0];
    const imageFile = new Moralis.File(data.name, data);
    document.getElementById('upload').setAttribute("disabled", null);
    document.getElementById('file').setAttribute("disabled", null);
    document.getElementById('name').setAttribute("disabled", null);
    document.getElementById('description').setAttribute("disabled", null);
    await imageFile.saveIPFS();
    const imageURI = imageFile.ipfs();
    const metadata = {
      "name":document.getElementById("name").value,
      "description":document.getElementById("description").value,
      "image":imageURI
    }
    const metadataFile = new Moralis.File("metadata.json", {base64 : btoa(JSON.stringify(metadata))});
    await metadataFile.saveIPFS();
    const metadataURI = metadataFile.ipfs();
    const txt = await mintToken(metadataURI).then(notify)
  }
  
  async function mintToken(_uri){
    const encodedFunction = web3.eth.abi.encodeFunctionCall({
      name: "mintToken",
      type: "function",
      inputs: [{
        type: 'string',
        name: 'tokenURI'
        }]
    }, [_uri]);
  
    const transactionParameters = {
      to: nft_contract_address,
      from: ethereum.selectedAddress,
      data: encodedFunction
    };
    const txt = await ethereum.request({
      method: 'eth_sendTransaction',
      params: [transactionParameters]
    });
    return txt
  }


//Display NFT Functions

async function populateNFTs(){
    const localNFTs = await getNFTs().then(function (data){
        let nftDisplays = getNFTObjects(data);
        displayUserNFTs(nftDisplays);
    });
}

async function getNFTs(){
    const options = { chain: "0x61", address: ethereum.selectedAddress, token_address: nft_contract_address };
    const queryAll = await Moralis.Web3API.account.getNFTsForContract(options);
    const data = await queryAll.result;

    console.log(data);
    nftArray = [];
    for (let i=0; i< data.length; i++){
        
        const metadataInfo = await fetch(data[i]["token_uri"]);
        const metadata = await metadataInfo.json();
        console.log(metadata);
        const nft = {"object_id":i, "token_id":data[i]["token_id"],"token_uri":data[i]["token_uri"],"contract_type":data[i]["contract_type"],"token_address":data[i]["token_address"],"image":metadata["image"],"name":metadata["name"],"description":metadata["description"]}
        nftArray.push(nft)
    }
    return nftArray;
}

function displayUserNFTs(data){
    let entryPoint = 0;
    let rowId = 0;
    for (i=0;i<data.length;i+=3){
        let row = `<div id="row_${rowId}" class="row"></div>`;
        document.getElementById('NFTLists').innerHTML += row;
        for (j=entryPoint;j<=entryPoint+2;j++){
            if (j< data.length){
            document.getElementById("row_"+rowId).innerHTML += data[j];
            }
        }
        entryPoint += 3;
        rowId += 1;
    }
}

function cleanNFTList(){
    document.getElementById('NFTLists').innerHTML = "";
}

function generateNFTDisplay(id, name, description, uri){
    const nftDisplay = `<div id="${id}" class="col-lg-4 text-center">
                            <img src=${uri} class="img-fluid rounded" style="max-width: 30%">
                            <h3>${name}</h3>
                            <p>${description}</p>
                            <button id="button_${id}" class="btn btn-dark" onclick="selectNFT(this);">Select</button>
                        </div>`
    return nftDisplay;
}

function getNFTObjects(array){
    let nfts = [];
    for (i=0;i<array.length;i++){
        nfts.push(generateNFTDisplay(array[i].object_id,array[i].name,array[i].description,array[i].image))
    }
    return nfts;
}

async function selectNFT(nftObject){
    const nftId = nftObject.parentElement.id;
    let nft = window.nftArray.find(object => object.object_id == nftId);
    nftOffered = await isNFTOffered(nft.token_address,nft.token_id);
    const nftDisplay = `<div id="${nft.object_id}" class="text-center">
                            <img src=${nft.image} class="img-fluid rounded" style="max-width: 40%">
                            <h3>${nft.name}</h3>
                            <p>${nft.description}</p>
                            <div id="sellActions">
                                <input id="price" type="text" class="form-control mb-2" placeholder="Price"> 
                                <button id="sellButton"class="btn btn-dark btn-lg btn-block mb-2" id="sell" onclick="offerNFT(this);">Offer for Sale</button>
                                <button id="approveButton"class="btn btn-dark btn-lg btn-block mb-2" id="sell" onclick="approveNFT(this);">Approve</button>
                            </div>
                        </div>`
    document.getElementById("featured_nft").innerHTML = nftDisplay;
    if (nftOffered){
        document.getElementById("sellActions").remove();
    }
}

async function isNFTOffered(hostContract, tokenId){
    let offering_exist = true;
    let offering_closed = false;
    const queryAll = new Moralis.Query("PlacedOfferings");
    queryAll.equalTo("hostContract", hostContract);
    queryAll.equalTo("tokenId", tokenId);
    const data = await queryAll.find();
    data.length > 0? offering_exist = true: offering_exist = false;
    for (let i=0; i< data.length; i++){
        offering_closed = await isOfferingClosed(data[i].get("offeringId"));
    }
    const result = offering_exist && !offering_closed
    return result;
}

//Display Offering Functions
async function populateOfferings(){
    let offeringArray = await getOfferings();
    let offerings = await getOfferingObjects(offeringArray);
    displayOfferings(offerings);
}

async function getOfferings(){
    const queryAll = new Moralis.Query("PlacedOfferings");
    const data = await queryAll.find()
    offeringArray = [];
    for (let i=0; i< data.length; i++){
        let flag = await isOfferingClosed(data[i].get("offeringId"));
        if (!flag) {
            const metadataInfo = await fetch(data[i].get("uri"));
            const metadata = await metadataInfo.json();
            const offering = {"offeringId":data[i].get("offeringId"),"offerer":data[i].get("offerer"),"hostContract":data[i].get("hostContract"),"tokenId":data[i].get("tokenId"),"price":web3.utils.fromWei(data[i].get("price")),"image":metadata["image"],"name":metadata["name"],"description":metadata["description"]}
            offeringArray.push(offering)
        }
    }
    return offeringArray;
}

async function isOfferingClosed(offeringId){
    const queryAll = new Moralis.Query("ClosedOfferings");
    queryAll.equalTo("offeringId", offeringId);
    const data = await queryAll.find();
    data.length > 0? result = true: result = false;
    return result;
}

function generateOfferingDisplay(id, uri, name, price){
    const offeringDisplay = `<div id="${id}" class="row">
                                <div class="col-lg-6 text-center">
                                    <img src=${uri} class="img-fluid rounded" style="max-width: 30%">
                                </div>
                                <div class="col-lg-6 text-center align-middle">
                                    <h3>${name}</h3>
                                    <h4>${price} ETH</h4>
                                    <button id="button_${id}" class="btn btn-dark" onclick="selectOffering(this);">Select</button>
                                </div>
                            </div>`
    return offeringDisplay;
}

function getOfferingObjects(array){
    let offerings = [];
    for (i=0;i<array.length;i++){
        offerings.push(generateOfferingDisplay(array[i].offeringId,array[i].image,array[i].name,array[i].price))
    }
    return offerings;
}

function displayOfferings(data){
    for (i=0;i<data.length;i++){
        document.getElementById('offeringList').innerHTML += data[i];
    }
}

function cleanOfferings(){
    document.getElementById('offeringList').innerHTML = "";
}

async function selectOffering(offeringObject){
    const offeringId = offeringObject.parentElement.parentElement.id;
    let offering = window.offeringArray.find(offering => offering.offeringId == offeringId);
    const offeringDisplay = `<div id="${offering.offeringId}" class="text-center">
                            <img src=${offering.image} class="img-fluid rounded" style="max-width: 40%">
                            <h3>${offering.name}</h3>
                            <h3>${offering.price + " ETH"}</h3>
                            <div id="buyActions">
                                <button id="buyButton"class="btn btn-dark btn-lg btn-block mb-2" onclick="buyNFT(this);">Buy</button>
                            </div>
                        </div>`
    document.getElementById("featured_nft").innerHTML = offeringDisplay;
    if (offering.offerer == ethereum.selectedAddress){
        document.getElementById("buyActions").remove();
    }
}


//Sell NFT Funtions

async function approveNFT(context){
    let nftId = context.parentElement.parentElement.id;
    let nft = window.nftArray.find(object => object.object_id == nftId);
    const price = document.getElementById("price").value;
    const contract = nft.token_address;
    const tokenId = nft.token_id;
    context.setAttribute("disabled",null);
    const approval = await approveMarketPlace(contract, tokenId);
}

async function offerNFT(context){
    let nftId = context.parentElement.parentElement.id;
    let nft = window.nftArray.find(object => object.object_id == nftId);
    const price = document.getElementById("price").value;
    const contract = nft.token_address;
    const tokenId = nft.token_id;
    context.setAttribute("disabled",null);
    const offering = await placeOffering(contract, tokenId, price, ethereum.selectedAddress);
    const tx_offer = `<p> Offer transaction ${offering}</p>`;
    context.parentElement.innerHTML = tx_offer;
}

const nft_market_place_abi = [{"inputs": [{"internalType": "address", "name": "_operator", "type": "address"}], "stateMutability": "nonpayable", "type": "constructor", "name": "constructor"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "address", "name": "beneficiary", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256"}], "name": "BalanceWithdrawn", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "bytes32", "name": "offeringId", "type": "bytes32"}, {"indexed": true, "internalType": "address", "name": "buyer", "type": "address"}], "name": "OfferingClosed", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": true, "internalType": "bytes32", "name": "offeringId", "type": "bytes32"}, {"indexed": true, "internalType": "address", "name": "hostContract", "type": "address"}, {"indexed": true, "internalType": "address", "name": "offerer", "type": "address"}, {"indexed": false, "internalType": "uint256", "name": "tokenId", "type": "uint256"}, {"indexed": false, "internalType": "uint256", "name": "price", "type": "uint256"}, {"indexed": false, "internalType": "string", "name": "uri", "type": "string"}], "name": "OfferingPlaced", "type": "event"}, {"anonymous": false, "inputs": [{"indexed": false, "internalType": "address", "name": "previousOperator", "type": "address"}, {"indexed": false, "internalType": "address", "name": "newOperator", "type": "address"}], "name": "OperatorChanged", "type": "event"}, {"inputs": [{"internalType": "address", "name": "_newOperator", "type": "address"}], "name": "changeOperator", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "_offeringId", "type": "bytes32"}], "name": "closeOffering", "outputs": [], "stateMutability": "payable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "_offerer", "type": "address"}, {"internalType": "address", "name": "_hostContract", "type": "address"}, {"internalType": "uint256", "name": "_tokenId", "type": "uint256"}, {"internalType": "uint256", "name": "_price", "type": "uint256"}], "name": "placeOffering", "outputs": [], "stateMutability": "nonpayable", "type": "function"}, {"inputs": [{"internalType": "address", "name": "_address", "type": "address"}], "name": "viewBalances", "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}], "stateMutability": "view", "type": "function"}, {"inputs": [{"internalType": "bytes32", "name": "_offeringId", "type": "bytes32"}], "name": "viewOfferingNFT", "outputs": [{"internalType": "address", "name": "", "type": "address"}, {"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "uint256", "name": "", "type": "uint256"}, {"internalType": "bool", "name": "", "type": "bool"}], "stateMutability": "view", "type": "function"}, {"inputs": [], "name": "withdrawBalance", "outputs": [], "stateMutability": "nonpayable", "type": "function"}];
const marketPlace = new web3.eth.Contract(nft_market_place_abi,nft_market_place_address);

async function placeOffering(_hostContract, _tokenId, _price, _offerer) {
    /**
     * 
     *     testnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      gasPrice: 20000000000,
      accounts: {mnemonic: mnemonic}
    },
     */

    const coordinatorKey = "bcec9fed7983bd8f019676e43a2f84018c384344409d3ff9b97004ba8ec3f31b";
    const nonceOperator = await web3.eth.getTransactionCount("0x5d095B324dF85C3610aEF8886eF272c6DcB6D6c5");
    const functionCall = await marketPlace.methods.placeOffering(_offerer,_hostContract,_tokenId,web3.utils.toWei(_price,"ether")).encodeABI();
    transactionBody = {
        to: nft_market_place_address,
        nonce: nonceOperator,
        data:functionCall,
        gas:4000000,
      	gasPrice:web3.utils.toWei("20", "gwei")
    }
    signedTransaction = await web3.eth.accounts.signTransaction(transactionBody, coordinatorKey);
    fulfillTx = await web3.eth.sendSignedTransaction(signedTransaction.rawTransaction);
    console.log(fulfillTx);
    return fulfillTx;
}

async function approveMarketPlace(hostContract, tokenId){
    const encodedFunction = web3.eth.abi.encodeFunctionCall({
        name: "approve",
        type: "function",
        inputs: [
            {type: 'address',
            name: 'to'},
            {type: 'uint256',
            name: 'tokenURI'}]
    }, [nft_market_place_address, tokenId]);
    
    const transactionParameters = {
        to: hostContract,
        from: ethereum.selectedAddress,
        data: encodedFunction
    };
    const txt = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
    });
    return txt
}

//Buy NFT Funtions

async function buyNFT(context){
    const offeringId = context.parentElement.parentElement.id;
    let offering = window.offeringArray.find(object => object.offeringId == offeringId);
    const price = Moralis.Units.ETH(offering.price);
    const priceHexString = BigInt(price).toString(16);
    closedOffering = await closeOffering(offeringId,priceHexString);
    const tx_closeOffering = `<p> Buying transaction ${closedOffering}</p>`;
    context.parentElement.innerHTML = tx_closeOffering;
}

async function closeOffering(offeringId, priceEncoded){
    const encodedFunction = web3.eth.abi.encodeFunctionCall({
        name: "closeOffering",
        type: "function",
        inputs: [
            {type: 'bytes32',
            name: '_offeringId'}]
    }, [offeringId]);
    
    const transactionParameters = {
        to: nft_market_place_address,
        from: ethereum.selectedAddress,
        value: priceEncoded,
        data: encodedFunction
    };
    const txt = await ethereum.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters]
    });
    return txt
}