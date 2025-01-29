const express = require('express');
const router = express.Router();

const Cart = require('../models/carts');

const { getHoursFromDate } = require('../modules/helpers');

/** Middleware */

function areFieldsExistForSave(req, res, next) {
    const requiredFields = ['tripID', 'cartID'];
    const errors = [];

    requiredFields.forEach(field => {
        if (!req.body[field]) {
            errors.push({ [field]: `The field ${field} is required in body.` });
        }
    });

    if (errors.length > 0) {
        return res.status(400).json({ success: false, messages: errors });
    }

    next();
}

async function isCartExists(req, res, next) {
    if (!req.params.cartID) {
        return res.json({ result: false, message: 'Missing cartID field in params' });
    }

    const exist = await Cart.exists({_id : req.params.cartID});

    if (exist === null) {
        return res.json({ result: false, message: 'Cart does not exist' });
    }

    next();
}
/** END OF Middleware */

/** Routes */
/** Route GET /all */
router.get('/', async (req, res, next) => {
    // const { cartID } = req.query;

    try {
        // if (cartID === undefined) {
        const cart = await Cart.findOne({}).populate('trips').lean();
        // } else {
            // cart = await Cart.findById(cartID).populate('trips').lean();
        // }

        if (cart === null) {
            return res.json({ result: false, cart: {} });
        }

       for (const trip of cart.trips) {
            trip.hours = getHoursFromDate(trip.date);
        }

        return res.json({ result: true, cart: cart });
    } catch (e) {
        console.error('Error With Route GET /carts =>', e);
        return res.json({ result: false, message: e.message });
    }
});
/** END OF Route GET /all */


/** Route POST /save */
router.post('/save', areFieldsExistForSave, async (req, res, next) => {
    const { tripID } = req.body;
    // const query = cartID !== '0' ? { _id: cartID } : {};

    try {
        // const cart = await Cart.findOneAndUpdate(
        //     { $addToSet: { trips: tripID } },
        //     { upsert: true, new: true }
        // );

        const cart = await Cart.findOneAndUpdate(
            {},
            { $addToSet: { trips: tripID } },
            { upsert: true, new: true }
        );

        return res.json({ result: true, cartID: cart._id});
    } catch (e) {
        console.error('Error With Route POST /carts/save =>', e);
        return res.json({ result: false, message: e.message });
    }
});
/** END OF Route POST /save */




/** Route DELETE /delete/:cartID */
router.delete('/delete/:cartID/:tripID', isCartExists, async (req, res, next) => {
    const { cartID, tripID } = req.params;

    try {
        const updatedCart = await Cart.findByIdAndUpdate(
            cartID,
            { $pull: { trips: tripID } },
            { new: true } 
        );

        if (updatedCart.trips.length === 0) {
            await Cart.findByIdAndDelete(cartID);
            return res.json({ result: true, message: 'Cart deleted because it is empty' });
        }

        return res.json({ result: true, message: 'Cart deleted' });
    } catch (e) {
        console.error('Error With Route DELETE /carts/delete/:cartID =>', e);
        return res.json({ result: false, message: e.message });
    }
});
/** END OF Route POST /delete/:cartID */
/** END OF Routes */


module.exports = router;