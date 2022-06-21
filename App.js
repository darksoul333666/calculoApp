

import React, {useState, useEffect} from 'react';
var moment = require('moment'); // require
import 'moment/locale/es';
var RNFS = require('react-native-fs');
import { writeFile, readFile } from 'react-native-fs';
import { ApplicationProvider, Button, Text, List, ListItem, Card  } from '@ui-kitten/components';
import * as eva from '@eva-design/eva';

import type {Node} from 'react';
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  useColorScheme,
  Alert,
  TouchableOpacity,
  View,
  Dimensions,
  Platform
} from 'react-native';

import {
  Colors
} from 'react-native/Libraries/NewAppScreen';
import DocumentPicker, {
  DirectoryPickerResponse,
  DocumentPickerResponse,
  isInProgress,
  types,
} from 'react-native-document-picker';

import XLSX from "xlsx";
import { FileSystem } from "react-native-file-access";
import Loading  from './Loading';


const App: () => Node = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const [dailyJsons, setDailyJsons] = useState([
    ["Fecha", 
    "GPS name",
    "Hora de inicio de la ruta", 
    "Hora final de la ruta", 
    "Kilómetros recorridos", 
    "Tiempo de la unidad encendida",
    "Registros de alarma de velocidad", 
  ]
]);
const [data, setData] = useState([]);
const [loading, setLoading] = useState(false);
const convertXslxToJson =  (files) => {
    return new Promise((resolve, reject)=>{
      files.forEach(async (file, index) =>{
        const b64 = await FileSystem.readFile(file.uri, "base64");
        const workbook = XLSX.read(b64, {type: "base64"});
        const jsonData =  XLSX.utils.sheet_to_json(workbook.Sheets[workbook.SheetNames[0]]);
        calculate(jsonData);
       if( index == files.length-1){
          resolve( true)
        
       }
        
        })
    })
    
    
    }
  const calculate = (jsonData) =>{
    let activeTime = 0;
    let prevDate;
    let hourStart;
    let hourFinish;
    let date;
    let gpsName;
    let count = 0;
    let timer = 0;
    let continuityActive = false;
    let initialLapse;
    let finalLapse;
    let alarmArray = "";
    let countSpeed = 0;
    let initialLatitude;
    let initialLongitude;
    let finalLatitude;
    let finalLongitude;
    let kilometers = 0;
    jsonData.forEach((fila, index) => {
     
    date = parserDate(fila['Date & Time']);
    if(fila.Speed > 80){
      countSpeed++;
      let time =  parseInt(fila['Date & Time'].substring(11,13)) +"-"
                + parseInt(fila['Date & Time'].substring(14,16)) +"-"
                + parseInt(fila['Date & Time'].substring(17,19));
      alarmArray = alarmArray+ `\n${countSpeed} -> ${time} hrs -> ${fila.Speed} km/h `
    }
       if(fila.ACCStatus == 1){ 
         count ++;
       }
        if(fila.ACCStatus == 1 && !continuityActive){
            initialLapse = parserDate(fila['Date & Time']);
            continuityActive = true;
            initialLatitude = fila.Latitude;
            initialLongitude = fila.Longitude;

        }

        if(fila.ACCStatus == 0 && continuityActive){
          finalLapse = parserDate(fila['Date & Time']);
          continuityActive = false;
          timer = timer + ((finalLapse.getTime() - initialLapse.getTime()) / 1000) / 3600;
          hourFinish = `${date.getHours()}:${date.getMinutes()}`;
          gpsName = fila["GPS Name"]

          kilometers = kilometers + getKilometers(initialLatitude, initialLongitude, fila.Latitude, fila.Longitude)

        }
        if(count == 1){
        hourStart = `${date.getHours()}:${date.getMinutes()}`
       
        }
    });


    console.log("se recorrieron: ", kilometers);
    let day = moment(jsonData[0]['Date & Time'].substring(0, 10)).locale('es').format('LLLL');
    let dayParsed = day.substring(0, day.length - 4);
    let daily = dailyJsons;
    let d = [dayParsed, gpsName, hourStart, hourFinish, kilometers.toFixed(2), parserActiveTime(timer), alarmArray.length >0 ? alarmArray : "No se rebasó el límite"]
    daily.push(d)
    setDailyJsons([...daily]);
  } 
 
   
  const openFile = () =>{
    DocumentPicker.pick({
      allowMultiSelection: true,
      type: [types.xlsx, types.xls],
    })
      .then(async(files) =>{
        setLoading(true)
        convertXslxToJson(files).then(res =>{
          setLoading(false)
          setData(dailyJsons)

          // convertJsonsToWorkBook()

        }).catch(error=>{
          console.log(error);
        })
       
      })
      .catch(err =>{
        console.log(err);
      })
  }

  function parserDate(date){
    let year = parseInt(date.substring(0,4));
    let month = parseInt(date.substring(5,7));
    let day =  parseInt(date.substring(8,10));
    let hour =  parseInt(date.substring(11,13));
    let minutes =  parseInt(date.substring(14,16));
    let seconds =  parseInt(date.substring(17,19));
    return new Date(year, month-1, day, hour , minutes, seconds )
  } 

  function parserActiveTime(time){
    let timeParser; 
      if (time < 1){
        timeParser =  `${(time / 60).toString()} minutos`;

      } else if ( time == 1 ){
        timeParser =  'Una hora';

      } else if(time > 1) {
        timeParser = `${parseInt(time)} horas y ${parseInt((time % 1) * 60)} minutos`

      }    
    return timeParser
  }
  function convertJsonsToWorkBook(){
  
      let worksheet = XLSX.utils.aoa_to_sheet(dailyJsons);
      let new_workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(new_workbook, worksheet, "Tabla");
     
     let binary = XLSX.write(new_workbook, {type:'binary', bookType:"xlsx"});
     let date = new Date();
     let dateParse = date.getDate().toString() + "-" + (date.getMonth() +1).toString() + "-" + date.getFullYear().toString();
     let uri = RNFS.ExternalDirectoryPath  + `/formato_${dateParse}.xlsx`
     writeFile(uri, binary, 'ascii')
     .then((r)=>{
       Alert.alert("El archivo fue generado con éxito");
       let d = data;

    })
     .catch((e)=>{/* :( */});

  }
  
   const getKilometers = (lat1, lon1, lat2, lon2) => {
    const rad = x => {
      return (x * Math.PI) / 180;
    };
  
    const RADIO = 6378.137; //Radio de la tierra en km
  
    const dLat = rad(lat2 - lat1);
    const dLong = rad(lon2 - lon1);
  
    const A =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(rad(lat1)) *
        Math.cos(rad(lat2)) *
        Math.sin(dLong / 2) *
        Math.sin(dLong / 2);
  
    const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));
    const D = RADIO * C;
    return Number(D.toFixed(2));
  };
  

 
const renderCards = ({ item, index }) =>{
    if(index !== 0){
      return (
        <ListItem>
           <Card status='primary' style = {styles.card}>
           <Text style={styles.text}>Fecha: {item[0]} </Text>
          <Text style={styles.text}>Unidad: {item[1]} </Text>
          <Text style={styles.text}>Hora de inicio: {item[2]} </Text>
          <Text style={styles.text}>Hora de término: {item[3]} </Text>
          <Text style={styles.text}>Kilómetros recorridos: {item[4]} km </Text>
          <Text style={styles.text}>Tiempo de unidad encendida:  {item[5]} </Text>
          <Text style={styles.text}>Alarma de velocidad: {item[6]} </Text>
        </Card>
        </ListItem>
      )
    }
   
  
  
}
  return (
    <ApplicationProvider {...eva} theme={eva.light}>
    <SafeAreaView>
    <Loading text={"Cargando"} visible={loading} />

          <View style={styles.container}>
            <Button 
            style = {styles.button}
            status="primary"
            size={"giant"}
            appearance="filled" 
            onPress={()=>openFile()}>
           Agregar archivos
          </Button>
           
          <List
            style = {styles.listContainer}
             data={data}
             renderItem={renderCards}
            >
          </List>
          <Button 
            style = {styles.buttonDownload}
            status="primary"
            size={"giant"}
            appearance="filled" 
            onPress={convertJsonsToWorkBook}>
            Descargar en excel
          </Button>          
          </View>
            
    </SafeAreaView>
    </ApplicationProvider>
  );
};

const styles = StyleSheet.create({
  sectionContainer: {
    marginTop: 32,
    paddingHorizontal: 24,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '600',
  },
  sectionDescription: {
    marginTop: 8,
    fontSize: 18,
    fontWeight: '400',
  },
  highlight: {
    fontWeight: '700',
  },
  container : {
    display : "flex",
    alignItems: 'center',
    justifyContent: 'center',
    height: "100%",
    width: "100%"

  },
  button : {
    width: 250,
    height: "5%",
    alignItems: "center",
    marginTop: 10
  },
  buttonDownload : {
    width: 250,
    height: "5%",
    alignItems: "flex-end",
    marginTop: 5,
    marginBottom: 10
  },
  card : {
    width: "90%",
    marginLeft: "5%"
  },
  text :{
    fontSize: 20
  },
  listContainer : {
    width: "85%"
  }
});

export default App;
