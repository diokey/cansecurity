/*jslint node:true, unused:vars */
/*global before,it,describe,after */
var express = require( 'express' ), restify = require('restify'),
	app,
	cs = require( './resources/cs' ),
	errorHandler = require( './resources/error' ),
	cookieParser = require('cookie-parser'),
	session = require('express-session'),
	request = require( 'supertest' ),
	r, cansec, tokenlib = require( '../lib/token' ),
	authHeader = "X-CS-Auth".toLowerCase(),
	path = "/public",
alltests = function () {
	describe( 'validatePassword', function () {
		it( 'should reject user not logged in', function ( done ) {
			r.get( path ).expect( 401, done );
		} );
		it( 'should reject user with bad password', function ( done ) {
			r.get( path ).auth( "john", "BADPASS" ).expect( 401, done );
		} );
		it( 'should successfully log in', function ( done ) {
			r.get( path ).auth( "john", "1234" ).expect( 200, done );
		} );
	} );
	describe( 'getUser', function () {
		it( 'should reject invalid token', function ( done ) {
			r.get( path ).set( authHeader, "blahblah" ).expect( 401, done );
		} );
		it( 'should reject expired token', function ( done ) {
			var token = tokenlib.generate( "john", "1234", new Date().getTime() - ( 24 * 60 * 60 * 1000 ) );
			r.get( path ).set( authHeader, token ).expect( 401, done );
		} );
		it( 'should accept a valid token', function ( done ) {
			var token = tokenlib.generate( "john", "1234", new Date().getTime() + 15 * 60 * 1000 ),
				re = /^success=/;
			r.get( path ).set( authHeader, token ).expect( 200 ).expect( authHeader, re, done );
		} );
	} );	
};
describe( 'legacy handlers', function () {
	before(function(){
		cansec = cs.initLegacy();
	});
	describe('express', function(){
		before( function () {
			app = express();
			app.use( cookieParser() );
			app.use( session( {
				secret: "agf67dchkQ!",resave:false,saveUninitialized:false
			} ) );
			app.use( cansec.validate );
			app.use( errorHandler );
			app.get( path, cansec.restrictToLoggedIn, function ( req, res, next ) {
				// send a 200
				require('../lib/sender')(res,200);
			} );
			r = request( app );
		} );
		alltests();
	});
	describe('restify', function(){
		before( function () {
			app = restify.createServer();
			app.use( cansec.validate );
			app.get( path, cansec.restrictToLoggedIn, function ( req, res, next ) {
				// send a 200
				require('../lib/sender')(res,200);
			} );
			r = request( app );
		});
		after(function(){
			app.close();
		});
		alltests();		
	});

} );