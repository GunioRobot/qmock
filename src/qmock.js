 /**
 * QMock - Copyright (c) 2008
 * Dual licensed under the MIT (MIT-LICENSE.txt) and GPL (GPL-LICENSE.txt) licenses.
 *
 * @author Mark Meyer // Andy Beeching
 * @classDescription qMock is a lightweight object mocking library
 * @dependencies A comparison routine set on QMock.compare (e.g. QUnit.equiv)
 * @example var mock = new Mock();
 *
 * QUnit TODO
 * TODO: Patch QUnit to support a sentence like: 700 tests of 702 run passed, 2 failed and 150 weren't run.
 *
 * QMock TODO
 * TODO: Optional strict method ordering flag? e.g. {ordered: true}
 * TODO: Document Mock object (plus Method) API
 * TODO: Skin testrunner
 * TODO: Add scriptDoc support for instance methods and IDE completion
 * TODO: Support for custom exceptions?
 * TODO: Force array literals in params via JSON

 * TODO: Expectations on invocations to go through calls only - ditch syntactic sugar...
 * TODO: add a end() utility function for restoration of scope to Mock obj (instead of member) 
 
 * TODO: Support for HTMLCollections, nodeLists?
 * TODO: Support for DOM Element References
 * TODO: Ensure support for all major testruners - QUnit/YUI/GOOG/Evidence/ScrewUnit/JsSpec..
 * TODO: Look into dynamic generation of mocks based on code lib, and/or pdoc comments.
 * TODO: Change behaviour of the mock so that when passed functions it matches by type (for literals and constructors)
 * TODO: Make autoMockConstructor thing work for constructors (i.e. call)
 * TODO: Change how property / withValue work for better (and faster) declaration of stubbed properties
 * TODO: Add failSlow support
 * TODO: Add failSlow message support (t/f for msg param)
 * 
 * Assay TODO
 * TODO: Publish CommonJS compliant API for ASSAY
 * TODO: Write simple helper function to test valid stuff in loops
 * TODO: Early exclusions via returns
 * TODO: Need to look into using getPrototypeOf method for object type checking...
 * TODO: Does assertHash check keys as well as values??!
 * TODO: Check able to delete QMock for clean-up purposes?
 * TODO: Add in support for NaN data type
 * TODO: Check whether my assertHash handles {DontEnum} enumeration...!
 * TDOO: Support for classical, protypical, & parasitic inheritance instance checking
 * TODO: Support for 'interface' conformance as well?
 * TODO: Allow deep option for recursing through trees - typed or stric (or even varied?)
 * TODO: Change expose function to accept list of expected methods (e.g. get, set, reset - save memory!)
 */


/* QMock Initialisation
 *
 * QMock requires a comparison routine for all object types
 * (e.g. QUnit.equiv, assert.deepEquals, or Assay.compare)
 *
 */

(function ( container, undefined ) {

  // Attempt to trap originals / built-in objects as can be shadowed / overwritten by other scripts
  var slice = Array.prototype.slice,
      toString = Object.prototype.toString,
      hasOwnProperty = Object.prototype.hasOwnProperty;

      // default configuration options
      config = {
        failFast: true,
        compare: false
      };

  // UTILITY Functions

  // Following borrowed from jQuery but most credit to Mark Miller for 'Miller Device'
  function is ( nativeType, obj ) {
    return toString.call( obj ) === "[object " + nativeType + "]";
  }

  function isNot () {
    return !is.apply( null, arguments );
  }

  function trimCollection ( a, b ) {
    return slice.call( a, 0, b.length );
  }

  function comparePresentation ( presentation, expectations, opt_property ) {
    for ( var result = false, i = 0, len = expectations.length; i < len; i++ ) {
      // If match found against presentation return bound object (or self if chained)
      if ( config.compare( presentation, expectations[ i ][ "accepts" ] ) ) {
        result = ( opt_property )
          ? expectations[ i ][ opt_property ]
          : true
        break;
      }
    }
    return result;
  }

  // FUNCTIONS FOR SETUP PHASE

  // Factory for creating a stubbed function
  // Binds the mutator (stub) to a specific method state (constructor or member)
  // Adds accessor to internal state for debugging purposes
  // Method param should implement Member interface
  // Returns bound stub function
  function createStub ( method ) {

    function stub () {
      // Normalise actual parameters
      var presentation = slice.call( arguments );
      // Track method invocations
      method._calls++;
      // Store presentation to method for verify phase
      method._received.push( presentation );
      // Trigger callbacks with stubbed responses
      exerciseCallbacks( presentation, method._expected, method );
      // Return stubbed fn value
      return exerciseReturn( presentation, method._expected, method );
    }

    // Accessor to internal state of mock
    // Useful for debugging and watch()
    stub._getState = function () {
      return method;
    };

    // Stub is invoked when mocked method is called within the SUT.
    return stub;
  }

  // Factory for instantiating a new mocked Member object and associating it 
  // with a receiver object
  function createMember ( opt_min, opt_max, opt_receiver ) {
    // Create member instance
    var self = new Member( opt_min, opt_max );
    // If namespace provided setup references for recording interactions
    if ( opt_receiver ) {
      // Store reference to namespace on each member instance
      self._mock = opt_receiver;
      // Store reference to method in method list for reset functionality
      // <str>and potential strict execution order tracking<str>.
      opt_receiver._methods && opt_receiver._methods.push( self );
    }
    return self;
  }

  // FUNCTIONS FOR EXERCISE PHASE

  // ( String: presentation, Collection: expectations[, String: opt_prop )

  function exerciseCallbacks ( presentation, expectations, method ) {
    // Execute any callback functions specified with associated args
    for (var i = 0, len = presentation.length, data; i < len; i++) {
      // Check if potential callback passed
      if ( presentation[ i ] && is( "Function", presentation[ i ] ) ) {
        // Test for presentation match to expectations, and assign callback data if declared
        // Use data associated with presentation, or default to 'global' data if available
        data = comparePresentation( presentation, expectations, "data" ) || method._data || null;
        //
        if ( data != null ) {
          presentation[ i ].apply( null, [ data ] );
        }
        // reset data to undefined for next pass (multiple callbacks)
        data = null;
      }
    }
  }

  // Compare presentations with expectations and match to return value if specified
  // Else use global, which is 'undefined' by default
  function exerciseReturn ( presentation, expectations, method ) {
    return comparePresentation( presentation, expectations, "returns" ) || method._returns;
  }

  // FUNCTIONS FOR VERIFICATION

  // Evaluate expected method invocations against actual
  function verifyInvocations ( method ) {
    return ( method._minCalls != null )
      // If minCalls set there is an expectation
      // If one expression below true then return else expectations not met so false
      ? (
        // explicit call number defined
        method._minCalls === method._calls ||
        // arbitrary range defined
        ( method._minCalls <= method._calls ) && ( method._maxCalls >= method._calls ) ||
        // at least n calls
        ( method._minCalls < method._calls ) && ( method._maxCalls === Infinity ) )
      // Since no minCalls then no inovation expectations, all results are true.
      : true
    ;
  }

  // Evaluate number of parameters received during invocations
  function verifyOverloading ( method ) {
    return ( ( method._overload )
      // At least n Arg length checking - overloading allowed
      ? ( method._requires > method._received[0].length )
      // Strict Arg length checking - no overload
      : ( method._requires !== method._received[0].length )
    );
  }

  // Evaluate single presentation against method expectations if match ANY will return true
  function verifyPresentation ( presentation, expectations, opt_overload ) {
    for (var i = 0, len = expectations.length, expected, result = true; i < len; i++) {
      // reset so that empty presentation and empty expectation return true
      // If no expectations then won't be reached... retuns true.
      result = false;

      // expectation to compare
      expected = expectations[ i ].accepts;

      // If overloading allowed only want to check parameters passed-in (otherwise will fail)
      // Must also trim off overloaded args as no expectations for them.
      if ( !!opt_overload ) {
        presentation = trimCollection( presentation, expected );
        expected  = trimCollection( expected, presentation );
      }

      // If strict argument total checking is on just pass through expected and actual
      result |= config.compare( presentation, expected );

      // If true then exit early
      if ( !!result ) {
        return true;
      }
    }
    return !!result;
  }

  // Evaluate ALL parameters against expectations, only return true if
  // all match an expectation
  function verifyInterface ( method, opt_raise ) {
    // For each presentation to the interface...
    for (var params = 0, total = method._received.length, result = true; params < total; params++) {
      // ...Check if a matching expectation
      result &= verifyPresentation( method._received[ params ], method._expected, method._overload );
      // Record which presentations fail
      if ( !!!result && opt_raise ) {
        opt_raise( method._received[ params ], method._expected, "IncorrectParameterException", method._id + '()' );
      }
    }
    return result;
  }
  
  function verifyReceiver ( receiver, opt_raise ) {    
    // Verify Self (Constructor)
    var result = Member.prototype.verify.call( receiver, opt_raise );

    // Verify Members
    for (var i = 0, len = receiver._methods.length; i < len; i++) {
      result &= receiver._methods[ i ].verify( opt_raise );
    }

    // Live() or Die()
    if ( !!!result ) {
      // Meh.
      throw receiver._exceptions;
    } else {
      // Disco! \o/
      return !!result;
    }
  }
  
  // Used for teardown
  function resetReceiver ( receiver ) {
    receiver._exceptions = [];
    Member.prototype.reset.call( receiver );
    for (var i = 0, len = receiver._methods.length; i < len; i++) {
      receiver._methods[ i ].reset();
    }
  }

  // PRIVATE Functions

  // Function to handle JSON based mock creation
  function createMockFromJSON ( mockedMembers ) {

    if ( !mockedMembers ) { return false; }

    var blacklisted = /^(?:calls|min|max)$/; // List of method/property identifiers that are used in Qmock - protected.

    // loop through expected members on mock
    for ( var key in mockedMembers ) {

      var memberConfig = mockedMembers[key],
          isMethod = !!( memberConfig["value"] === undefined ),

      // register property or method onto mock interface
      member = this
        .expects
          .apply(member,
            (memberConfig.calls !== undefined)
              ? [memberConfig.calls]
              : [ (memberConfig.min) ? memberConfig.min : 0,
                  (memberConfig.max) ? memberConfig.max : Infinity ]
              )[( isMethod ) ? "method" : "property"](key);

      // Set expectations for method or value of property
      if ( isMethod ) {

        setExpectations:
          for (var expectation in memberConfig) {

          // Check property exists on mock object and is a callable method
          if ( (member[expectation] !== undefined)
            && (member[expectation].constructor === Function) ) {

            // Disco.
            member[ expectation ][
              ( (expectation === "interface" || expectation === "accepts")
              && !isNot( "Array", memberConfig[ expectation ] ))
                ? "apply"
                : "call"
            ](member, memberConfig[ expectation ]);

          } else if ( blacklisted.test( expectation ) ) {
            // If not callable check property not whitelisted before throwing error
            //throwMockException("Identifier for method on new Mock instance", "Mock." + member["name"] + "[" + expectation + "]", "InvalidMockInstanceMethodException", member["name"] + '.' + expectation);
          }

        } // end setExpectations loop

      } else {
        // If expectation not method then simply set property
        member.withValue(memberConfig["value"]);
      }

    }
    return undefined;
  }

  // Function to build pretty exception objects - TBR function signature
  // Can be improved by using Assay.type for expected and actual
  function createException ( actual, expected, exceptionType, descriptor ) {

    var e = {
        type : exceptionType
      },
      fn = "'" + descriptor + "'";

    switch (true) {
      case "IncorrectNumberOfArgumentsException" === exceptionType:
      case "MismatchedNumberOfMembersException" === exceptionType:
        e.message = fn + " expected: " + expected + " items, actual number was: " + actual;
        break;
      case "IncorrectNumberOfMethodCallsException" === exceptionType:
        e.message = fn + " expected: " + expected + " method calls, actual number was: " + actual;
        break;
      case "MissingHashKeyException":
        e.message = fn + " expected: " + expected + " key/property to exist on 'actual' object, actual was: " + actual;
      default:
        e.message = fn + " expected: " + expected + ", actual was: " + actual;
    }
    return e;
  }

  // Prototype for mocked method/property
  // Can I strip out 'un-required' properties - save initialisation...
  function Member ( min, max ) {
    // Default stub behaviours
    this._returns = undefined;
    this._requires = 0;
    this._overload = true;
    this._chained = false;
    this._data = null;
    // Default stub state
    this._expected = [];
    this._received = [];
    this._minCalls = min || null;
    this._maxCalls = max || null;
    this._calls = 0;
  };

  Member.prototype = {

    "id": function ( identifier ) {
      this._id = identifier;
      return this;
    },

    "method": function ( key ) {
      // Throw error if collision with mockMember API
      if ( hasOwnProperty.call( this._mock, key ) ) {
        throw {
          type: "InvalidMethodNameException",
          msg: "Qmock expects a unique identifier for each mocked method"
        };
      }

      // Useful for error messages / debugging
      this._id = key;

      // Register public interface to mocked method instance on target object
      this._mock[ key ] = createStub( this );

      // chain for pretty declaration
      return this;
    },
    
    // Expected format of arguments - {accepts: [ values ] [, returns: value] [, data: [ values ]] }
    "interface": function () {
      // Check for valid input to interface
      for (var i = 0, len = arguments.length; i < len; i++) {
        var acceptsProperty = arguments[ i ][ "accepts" ] || false; // attach hasOwnProperty check.
        if ( acceptsProperty === false ) {
          throw {
            type: "MissingAcceptsPropertyException",
            msg: "Qmock expects arguments to setInterfaceExpectations() to contain an accepts property"
          }
        } else if ( isNot( "Array", acceptsProperty ) ) {
          throw {
            type: "InvalidAcceptsValueException",
            msg: "Qmock expects value of 'accepts' in arguments to be an Array (note true array, not array-like)"
          }
        }
      }

      // Set minimum expectations
      this._requires = arguments[ 0 ][ "accepts" ].length;

     // TBD: Support for different requires per expected presentation
     // Assign explicit expectation if exist
     /* for ( var i = 0, len = arguments.length; i < len; i++ ) {
        if ( !arguments[ i ][ "required" ] ) {
          arguments[ i ][ "required" ] = arguments[ i ][ "accepts" ].length;
        }
      }*/
      this._expected = arguments;
      return this;
    },

    "accepts": function () {
      this._requires = arguments.length;
      this._expected.push( { "accepts" : slice.call( arguments ) } );
      return this;
    },

    "returns": function ( stub ) {
      this._returns = stub; // default is undefined
      return this;
    },

    "required": function ( num ) {
      this._requires = num;
      return this;
    },

    "overload": function ( bool ) {
      this._overload = bool;
      return this;
    },

    "data": function ( data ) {
      this._data = data;
      return this;
    },

    "property": function ( key ) {
      if ( hasOwnProperty.call( this._mock, key ) ) {
        throw {
          type: "InvalidPropertyNameException",
          msg: "Qmock expects a unique key for each stubbed property"
        };
      }
      this._mock[ key ] = "stub";
      return this;
    },

    "withValue": function ( value ) {
      for ( var key in this._mock ) {
        if ( hasOwnProperty.call( this._mock, key ) ) {
          if ( this._mock[ key ] === "stub" ) {
            this._mock[ key ] = value;
          }
        }
      }
      return this;
    },

    "chain": function () {
      this._returns = this._mock;
      return this;
    },

    "andExpects": function ( min, max ) {
      return this._mock.expects( min, max );
    },

    "reset": function () {
      this._calls = 0;
      this._received = [];
    },

    "verify": function ( opt_raise ) {
      // 1. Check number of method invocations if set
      if ( verifyInvocations( this ) ) {
        // If true and no calls then exclude from further interrogation
        if ( this._calls === 0 ) {
          return true;
        }
      } else {
        opt_raise && opt_raise( this._calls, this._minCalls, "IncorrectNumberOfMethodCallsException", this._id );
        return false;
      }

      // 2. Check number of parameters received
      // TBD: This doesn't seem to support multiple presentations to an interface? Checks 'global' _received
      // See if any paramters actually required, if so, verify against overloading behaviour
      if ( this._requires && verifyOverloading( this ) ) {
        opt_raise && opt_raise( this._received[ 0 ].length, this._expected.length, "IncorrectNumberOfArgumentsException", this._id );
        return false;
      }

      // 3. Assert all presentations to interface
      return verifyInterface( this, opt_raise );
    },

    atLeast: function ( num ) {
      this._minCalls = num;
      this._maxCalls = Infinity;
      return this;
    },

    noMoreThan: function ( num ) {
      this._maxCalls = num;
      return this;
    },

    calls: function ( min, max ) {
      this._minCalls = min || this._minCalls;
      this._maxCalls = max || this._maxCalls;
    }

  }; // End MockedMember.prototype declaration

  // Backward compatibility for QMock v0.1 API
  Member.prototype["withArguments"] = Member.prototype.accepts;
  Member.prototype["andReturns"] = Member.prototype.returns;
  Member.prototype["andChain"] = Member.prototype.chain;
  Member.prototype["callFunctionWith"] = Member.prototype.data;
  
  // Receiver Object Constructor
  // Receiver's can either be simple namespaces-esque functions, 
  // or full Constructor functions in their own right (a la jQuery $)
  function Receiver ( definition ) {

    // Create internal state
    var state = new Member,
    // Bind delegated stub invocation to Receiver instance state
        recorder = createStub( mock );

    function mock () {
      // Update Receiver instance state and return itself or explicit value
      return recorder.apply( null, arguments );
    }
    
    // Can't use receiver.prototype as function literal prototype not in prototype chain, e.g. a
    // lookup for (function () {}).foo goes to Function.prototype.foo (__proto__)
    // Pseudo-inheritance by copying values & references over to instance
    // Internal state is thus public, otherwise all methods on Member.prototype would
    // need manual scoping with .call() which too much of a dependency (and not future-proof)
    for ( var key in state ) {
      mock[ key ] = state[ key ];
    }
    
    // Augment with Receiver methods
    
    // Factory for creating new Members on receiver objects
    mock.expects = function ( opt_min, opt_max ) {
      return createMember( opt_min, opt_max, mock );
    };
    
    // Overriding some 'inherited' methods
    // Verify method, tests both constructor and declared method's respective states.
    mock.verify = function () {
      return verifyReceiver( mock, function () {
        mock._exceptions.push( createException.apply( null, arguments ) );
      });
    }
    
    // Reset method, resets both mock Constructor and associated mock member states
    mock.reset = function () {
      resetReceiver( mock );
    };
    
    // Augment with Receiver properties
    
    // Update default return state on Constuctors to themselves (for cascade-invocation declarations)
    // If the return value is overidden post-instance then it is assumed the mock is a standalone
    // constuctor and not acting as a receiver object (aka namespace)
    mock._returns = mock;
    // Store methods declared on receiver
    mock._methods = [];
    // Store verification errors
    mock._exceptions = [];

    // Backward compatibility with QMock v0.1 API
    mock.expectsArguments = mock.accepts;
    mock.andExpects = mock.expects;

    // If params passed to Mock constructor auto-magikally create mocked interface from JSON tree.
    if ( definition ) {
      createMockFromJSON.call( mock, definition );
    }

    // Mock-tatstic!
    return mock;
  }
  
  /////////////////
  
  // PUBLIC QMock API
  
  ////////////////
  
  // Expose internal methods for unit tests
  /*if ( undefined !== expose ) {
    // mock generator
    ;;;; assert.expose( createMockFromJSON, "_createMockFromJSON", MockConstructor );
  }*/
  
  // Expose QMock API
  container.QMock = {
    Mock: Receiver,
    Method: Member,
    config: config,
    version: "0.3", // follow semantic versioning conventions (http://semver.org/)
    is: is,
    createStub: createStub,
    verify: {
      invocations: verifyInvocations,
      overloading: verifyOverloading,
      arguments: verifyPresentation,
      receiver: verifyReceiver,
      interface: verifyInterface
    }
  };

  // Alias QMock.Mock for pretty Mock initialisation (i.e. new Mock)
  container.Mock = Receiver;

  // QMock was successfully initialised!
  return true;

})( (typeof exports !== "undefined") ? exports : this ); // if exports available assume CommonJS