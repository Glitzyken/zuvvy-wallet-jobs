import dotenv from 'dotenv';
import schedule from 'node-schedule';
import _ from 'lodash';
import axios from 'axios';

dotenv.config();

schedule.scheduleJob('*/5 * * * *', async () => {
  // Check the database for all transactions greater than #1,500 and carried out only between the hours of 7:00 AM and 3:00 PM and add the transaction details for transactions that meet the above criteria to a separate table on the database
  let res;

  try {
    res = await axios.get(
      `${process.env.BASE_URL}transactions/special-filters`,
      {
        headers: {
          'x-api-key': process.env.API_KEY as string,
        },
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.response?.data);
    }

    return;
  }

  const { filteredTransactions } = res.data.data;

  type TransactionDataType = {
    id?: number;
    uid?: string;
    type?: string;
    amount?: number;
    date?: string;
    status?: string;
    userId?: string;
    receiverDetails?: object;
    updatedAt?: string;
  };

  const postTransactionsData: TransactionDataType[] = [];

  _.forEach(filteredTransactions, function (transaction) {
    postTransactionsData.push(
      _.pick(transaction, [
        'type',
        'amount',
        'date',
        'status',
        'userId',
        'receiverDetails',
      ]),
    );
  });

  let createdPostTransactions;

  try {
    createdPostTransactions = await axios.post(
      `${process.env.BASE_URL}transactions/post-transactions`,
      { transactions: postTransactionsData },
      {
        headers: {
          'x-api-key': process.env.API_KEY as string,
        },
      },
    );
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(error.response?.data);
    }

    return;
  }

  if (createdPostTransactions.status === 200) {
    console.log('Post-Transaction records created successfully! 🥳');
  }

  // If the job runs between the hours of 12 noon to 2:45 PM, it should set a flag peak_hours on the above table to true
  const now = Date.now();
  const twelveNoon = new Date().setUTCHours(11, 59, 59, 999);
  const twoFourtyFivePm = new Date().setUTCHours(14, 44, 59, 999);

  if (now >= twelveNoon && now <= twoFourtyFivePm) {
    const url = `${process.env.BASE_URL}transactions/post-transactions/peak-hours`;

    let success;

    if (url) {
      try {
        success = await axios.patch(
          url,
          {},
          {
            headers: {
              'x-api-key': process.env.API_KEY as string,
            },
          },
        );
      } catch (error) {
        if (axios.isAxiosError(error)) {
          console.error(error.response?.data);
        }

        return;
      }
    }

    if (success) {
      console.log(success.data.message);
      console.log('peak_hours successful!!! 🥳');
    }
  }
});
