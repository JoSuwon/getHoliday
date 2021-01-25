import axios from 'axios';
import dotenv from 'dotenv';
dotenv.config();

const holidayAPI = axios.create({
  baseURL: process.env.API_HOST,
  timeout: 2000,
});


const getHoliday = async (startDate) => {
  let holidayMap = new Map();

  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);

  let currentDate = new Date(startDate);
  while (currentDate <= endDate) {
    const yyyy = currentDate.getFullYear().toString();
    const mm = (currentDate.getMonth() + 1).toString().padStart(2, '0');
    const dd = currentDate.getDate().toString().padStart(2, '0');
    switch (currentDate.getDay()) {
      case 0:
        holidayMap.set(`${yyyy}-${mm}-${dd}`, { date: new Date(currentDate), dateName: '일요일' });
        break;
      case 6:
        holidayMap.set(`${yyyy}-${mm}-${dd}`, { date: new Date(currentDate), dateName: '토요일' });
        break;
      default:
        break;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  const datas = await getData(startDate, endDate);
  Object.keys(datas).forEach(thisDate => {
    holidayMap.set(thisDate, datas[thisDate]);
  });

  return Array.from(holidayMap.values()).sort((a, c) => a.date - c.date);
};



function callHolidayAPI(date) {
  return holidayAPI({
    method: 'get',
    url: `/getRestDeInfo?serviceKey=${process.env.SERVICE_KEY}`,
    params: {
      solYear: date.getFullYear(),
      solMonth: (date.getMonth() + 1).toString().padStart(2, '0'),
      _type: 'json',
    },
  }).then(result => {
    const { totalCount } = result.data.response.body;
    if(totalCount === 0) {
      return {};
    } else if(totalCount === 1) {
      const data = result.data.response.body.items.item;
      const yyyy = data.locdate.toString().slice(0, 4);
      const mm = data.locdate.toString().slice(4, 6);
      const dd = data.locdate.toString().slice(6, 8);
      return { [`${yyyy}-${mm}-${dd}`]: { date: new Date(`${yyyy}-${mm}-${dd}`), dateName: data.dateName } };
    } else {
      const datas = result.data.response.body.items?.item || [];
      return datas.reduce((acc, cur) => {
        const yyyy = cur.locdate.toString().slice(0, 4);
        const mm = cur.locdate.toString().slice(4, 6);
        const dd = cur.locdate.toString().slice(6, 8);
        acc[`${yyyy}-${mm}-${dd}`] = { date: new Date(`${yyyy}-${mm}-${dd}`), dateName: cur.dateName };
        return acc;
      }, {});
    }
  });
}



const getData = async (startDate, endDate) => {
  const isChangeMonth = startDate.getMonth() !== endDate.getMonth();
  let items = {};

  if (isChangeMonth) {
    const [startMonthData, endMonthData] = await Promise.all([callHolidayAPI(startDate), callHolidayAPI(endDate)]);
    items = { ...startMonthData, ...endMonthData };
  } else {
    const data = await callHolidayAPI(startDate);
    items = { ...data };
  }

  const thisYear = startDate.getFullYear().toString();
  const workerDay = new Date(`${thisYear}-05-01`);
  if(workerDay >= startDate && workerDay <= endDate) {
    items[`${thisYear}-05-01`] = { date: workerDay, dateName: '근로자의날' };
  }
  const rangedItems = Object.keys(items).filter(thisDate => {
    return new Date(thisDate) >= startDate && new Date(thisDate) <= endDate;
  }).reduce((acc, cur) => {
    acc[cur] = items[cur];
    return acc;
  }, {});

  return rangedItems;
};




getHoliday(new Date('2017-04-29'))
  .then(result => console.log(result));