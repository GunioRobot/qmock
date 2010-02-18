 /**
 * QMock - Copyright (c) 2008
 * Dual licensed under the MIT (MIT-LICENSE.txt)
 * and GPL (GPL-LICENSE.txt) licenses.
 *
 * @author Mark Meyer // Andy Beeching
 * @classDescription qMock is a lightweight object mocking library
 * @dependencies None - free as a bird
 * @example var mock = new Mock();
 *
 * TODO: Support multiple callbacks with correlating arguments
 * TODO: Optional strict method ordering flag? e.g. {ordered: true}
 * TODO: Document Mock object (plus Method) API
 * TODO: Add 'Collection' Argument for DOM Manipulation
 * TODO: Skin testrunner
 * TODO: Add scriptDoc support for instance methods and IDE completion
 * TODO: Support for custom exceptions?
 * TODO: Force array literals in params via JSON
 * TODO: Strict flag for argument literal checking...
 * TODO: Expectations on invocations to go through calls only - ditch syntactic sugar...
 * TODO: Support for HTMLCollections, nodeLists?
 * TODO: Support for DOM Element References
 * TODO: Refactor out strict type checking function into unit testable privileged object.
 * TODO: Better support for multiple parameter error messages.
 * TODO: Decide how to flag overload vs strict argumement NUMBER check
 * TODO: Ensure support for all major testruners - QUnit/YUI/GOOG/Evidence/ScrewUnit/JsSpec..
 * TODO: Figure out a way to re-use mockedMember constructor wih mock constructors...SERIOUSLY NEED THIS, Constuctor features are messy as f*ck.
 * TODO: Refactor out object checking logic and make leaner....
 * TODO: Make code more readable with if (key in obj) notation... (rather than if(obj[key]))...
 * TODO: Question use of Constructor flag exception object? Really needed if execption thrown has enough detail? Or refactor as propert on exception thrown? e.g. e.objectType: "Constructor", "Method".
 * TODO: Add in optimisations for compilers like YUI & Google Closure.
 * TODO: add a end() utility function for restoration of scope to Mock obj (instead of member)
 * TODO: Look into dynamic generation of mocks based on code lib, and or pdoc comments? Mental.
 * TODO: Refactor conditionals with short-circuit evaluation...
 * TODO: Strict return support for single expected presentations? Too complex?
 * TODO: Protect against API collisions between QMock and Mocks through internal re-mapping (can I not just invoke directly off prototype chain?)
 * TODO: Extend callback parameter invocation to support multiple callback scenarios
 * TODO: Write simple helper function to test valid stuff in loops
 * TODO: Early exclusions via returns
 * TODO: Need to look into using getPrototypeOf method for object type checking...
 * TODO: Does assertHash check keys as well as values??!
 * TODO: Check able to delete QMock for clean-up purposes?
 * TODO: Add in support for NaN data type
 * TODO: Check whether my assertHash handles {DontEnum} enumeration...!
 * TODO: Group QUnit tests into sub-modules?
 * TODO: Support for identifiers.. might wait until refactor of all constructor/methods to subclassed mockMember instances.
 * TDOO: Support for classical, protypical, & parasitic inheritance instance checking
 * TODO: Double check inheritance properties of instanceof - plus support for 'interface' conformance as well?
 * TODO: Patch QUnit to support a sentence like: 700 tests of 702 run passed, 2 failed and 150 weren't run.
 * TODO: Change behaviour of the mock so that when passed functions it matches by type (for literals and constructors)
 * TODO: Change expose function to accept list of expected methods (e.g. get, set, reset - save memory!)
 * TODO: Add ability for desciptor on Mock Constructors
 * TODO: Make autoMockConstructor thing work for constructors (i.e. call)
 * Refactor hasOWnProperty into method()
 * TODO: Allow deep option for recursing through trees - typed or stric (or even varied?)
 * TODO: Publish CommonJS compliant API for ASSAY
 * TODO: Add setter method for config options to decouple from QMock idebtifier (see comparePresentations)

 */

///////////////////////////////////

// START of QMOCK

/*
 * QMock requires a comparison routine for all object types (e.g. QUnit.equiv, assert.deepEquals, or Assay.compare)
 * CommonJS assert interface offers a quasi-standard to adhere to for both test runners and matchers
 *
*/

//////////////////////////////////

(function ( container ) {

  // Try to ensure following are originals / built-in objects as can be shadowed / overwritten
  var undefined,
      slice = Array.prototype.slice,
      toString = Object.prototype.toString,

      // default configuration options
      config = {
        failFast: true,
        compare: false
      };

  // UTILITY Functions

  // Following inspired by jQuery but most credit to Mark Miller for 'Miller Device'
  function is ( nativeType, obj ) {
    return toString.call( obj ) === "[object " + nativeType + "]";
  }

  function isNot () {
    return !is.apply( null, arguments );
  }

  // ( String: presentation, Collection: expectations[, String: opt_prop )
  function comparePresentation ( presentation, expectations, opt_prop ) {
    for ( var result = false, i = 0, len = expectations.length; i < len; i++ ) {
      // If match found against presentation return bound object (or self if chained)
      if ( config.compare( presentation, expectations[ i ][ "accepts" ] ) ) {
        result = ( opt_prop )
          ? expectations[ i ][ opt_prop ]
          : true
        break;
      }
    }
    return result;
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

  // PUBLIC MOCK OBJECT CONSTRUCTOR
  function Mock () {

    // Check compare and alias
    if ( !!!QMock.config.compare || isNot( "Function", QMock.config.compare ) ) {
      new Error("QMock requires a legitimate comparison function to be set (Qmock.compare)'");
    }

    var mock = function MockObject () {
          // Can't use MockObject fn name, dies in IE <<< Changed to be ES5 compatible - test in IE!!
          // Should be able to use alias though? Held in closure..
          mock.actualArguments = slice.call(arguments); // Need to be normalised to same object type (since arguments don't share prototype with Arrays, thus would fail CommonJS deepEquals assertion)
          return mock;
        },
        methods = [], // List of MockedMember method instances declared on mock
        exceptions = [], // List of exceptions thrown by verify/verifyMethod functions,
        compare = QMock.config.compare; // Alias for readability and speed
        //"'Constructor' (#protip - you can pass in a (String) when instantiating a new Mock, which helps inform constructor-level error messages)";

    // Function to push arguments into Mock exceptions list
    function throwMockException () {
      exceptions.push( createException.apply( null, arguments ) );
    }

    // Prototype for mocked method/property
    // Can I strip out 'un-required' properties - save initialisation...
    function __Mock ( min, max ) {
      // Stub Behaviour
      this._expected = [{"accepts": [undefined]}];
      this._received = [];
      this._data = []; // TBR
      this._returns = undefined;
      // Expectations
      this._min = ( min !== undefined ) ? min : false;
      this._max = max || false;
      this._calls = 0;
      this._requires = false;
      this._overload = true;
      this._chained = false;
      // Store reference to method in method list for reset functionality <str>and potential strict execution order tracking<str>.
      methods.push(this);
    };

    __Mock.prototype = {

      "method": function ( key ) {
        // Throw error if collision with mockMember API
        // Change to hasOwnProperty Check
        if ( mock.hasOwnProperty( key ) ) {
          throwMockException("was reserved method name '" + key + "'", "a unique method name", "InvalidMethodNameException", "Constructor function");
          throw exceptions;
        }

        function matchReturn ( presentation, expectations, method ) {
          // Early return if chained
          if ( method._chained ) {
            return mock;
          }
          // Compare presentations with expectations and match to return value if specified
          // Else use global, which is 'undefined' by default
          return comparePresentation( presentation, expectations, "returns" ) || method._returns;
        }

        function fireCallback ( presentation, expectations, method ) {
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

        function updateMethodState ( method, presentation ) {
          // Track method invocations
          method._calls++;
          // Store presentation to method for verify phase
          method._received.push( presentation );
          // Stub callback responses
          fireCallback( presentation, method._expected, method );
          // Canned return value
          return matchReturn( presentation, method._expected, method  );
        }

        function createStub ( obj ) {
          // bind to curried function
          var stub = (function ( fn ) {
            return function () {
              return updateMethodState( obj, slice.call(arguments) );
            }
          })( obj );
          // Accessor for debugging internal state of mock
          stub._getState = function () {
            return obj;
          };
          // Stub is invoked when mocked method is called within the SUT.
          return stub;
        }

        // Register public interface to mocked method instance on mock klass
        mock[ key ] = (function ( method, name ) {
          // Useful for error messages / debugging
          method._id = name;
          // assign stub to identifier
          return createStub( method );
        })( this, key );

        // chain for pretty declaration
        return this;
      },

      "interface": function setInterfaceExpectations () {
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

        // Expected format of arguments - {accepts: [ values ] [, returns: value] [, response: [ values ]] }

        // Where arguments can equal either any type, or overloadable pairings.
        // e.g. "string" or {params: foo, returns: bar}. Note array literals must be nested ({params: ["string", [1,2,3]], returns: "meh"})
        // Normalize input to accepts into key/value expectation pairings

        // THIS NEEDS A DEBATE - DEFAULT IS FOR IMPLICT STRICT NUMBER OF, & VALUE OF, ARG CHECKING FOR 'PRESENTATIONS'.
        // If required number of arguments not already set, then implicitly set it to length of param array (so let ppl customise it)
        // Add in per presentation strict argument length unless already set either globally or locally (recommendation to keep it consistent locally - don't let mocks change behaviour in test group too much)
        // This should probably be part of the refactor... feels messy!
        if ( this._requires === false ) {

          // Set minimum expectations
          this._requires = arguments[ 0 ][ "accepts" ].length;

          // Assign explicit expectation if exist
          for ( var i = 0, len = arguments.length; i < len; i++ ) {
            if ( !arguments[ i ][ "required" ] ) {
              arguments[ i ][ "required" ] = arguments[ i ][ "accepts" ].length;
            }
          }
        }
        this._expected = arguments;
        return this;
      },

      "accepts": function setSingleInterfaceExpectation () {
        this._requires = arguments.length;
        this._expected = [ { "accepts" : slice.call( arguments, 0 ) } ];
        return this;
      },

      "returns": function ( stub ) {
        this._returns = stub; // default is undefined
        return this;
      },

      "required": function ( total ) {
        this._requires = total;
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
        if ( mock.hasOwnProperty( key ) ) {
          throwMockException( "should be unique (was " + key + ")", "undefined property name", "InvalidPropertyNameException", "Constructor function" );
          throw exceptions;
        }
        mock[ key ] = "stub";
        return this;
      },

      "withValue": function ( value ) {
        for ( property in mock ) {
          if ( mock.hasOwnProperty( property ) ) {
            if ( mock[ property ] === "stub" ) {
              mock[ property ] = value;
            }
          }
        }
        return this;
      },

      "chain": function () {
        this._chained = true;
        return this;
      },

      "andExpects": function ( calls ) {
        return mock.expects( calls );
      },

      "verifyMethod": function () {
        assertMethod:
          with (this) {
           // Evaluate expected method invocations against actual
           assertMethodCalls:
             switch ( _min !== false ) {
               // max is infinite
               case (_max === Infinity) && (_calls > _min):
               // arbitrary range defined
               case (_max > 0) && (_calls >= _min) && (_calls <= _max):
               // explicit call number defined
               case (_min === _calls):
                 // Return verifyMethod early if no args to assert.
                 if (_calls === 0) {
                   return;
                 } else {
                   break assertMethodCalls;
                 }
               default:
                 throwMockException( _calls, _min, "IncorrectNumberOfMethodCallsException", _id);
                 break assertMethod;
             }

          // assert presentations.... LET's DO THAT AFTERWARDS...IN fact more like a loop around the old atomic presentation checking mechanism...

          // Evaluate method interface expectations against actual
          assertInterface: switch ( true ) {
            // Strict Arg length checking - no overload
            case ( _overload === false) && ( _requires !== false ) && ( _requires !== _received[0].length ):
            // At least n Arg length checking - overloading allowed - Global check
            case ( _overload === true) && ( _requires !== false ) && ( _requires > _received[0].length )  :
              throwMockException( _received.length, _expected.length, "IncorrectNumberOfArgumentsException", _id );
              break assertMethod;

            default:
              (function () {

              // Only check arguments if some available or explicitly required
              // By default functions returned 'undefined'
              // This feels hacky also... refactor out if possible!
              if ( _requires !== false || ( _calls > 0 && _received[0].length > 0 ) ) {

                assertPresentations: // For each presentation to the interface...

                  for (var i = 0, len = _received.length; i < len; i++) {

                    // Use to restore exceptions object to pre-presentation assertion state in case of match
                    var cachedExceptionTotal = exceptions.length;

                    assertExpectations: // ...Check if a matching expectation

                      for (var j = 0, _len = _expected.length; j < _len; j++) {

                        // Assert Number of Arguments if expectation explicitly set...
                        // At least n Arg length checking - overloading allowed - Global check
                        if ( _expected[ j ][ "required" ] > _received[ i ].length )  {
                          throwMockException( _received.length, _expected.length, "IncorrectNumberOfArgumentsException", _id );
                          continue assertPresentations;
                        }

                        var actual = ( _overload === false && _requires !== false )
                                   ? _received[ i ]
                                   // Else assume default mode of overloading and type checking against method interface
                                   : slice.call(_received[ i ], 0, _expected[ j ][ "accepts" ].length),
                            expected = ( _overload === false && _requires !== false )
                                     ? _expected[ j ][ "accepts" ]
                                     // Else assume default mode of overloading and type checking against method interface
                                     : slice.call(_expected[ j ][ "accepts" ], 0, _received[ i ].length);

                        // If a match (strict value checking) between a presentation and expectation restore exceptions object and assert next interface presentation.
                        // If strict argument total checking is on just pass through expected and actual
                        if ( compare( actual, expected ) ) {
                              /*,
                              {
                                "strictValueChecking": strictValueChecking, // done automatically for 'values', follow CommonJS assertion logic for non-primitves / date objects
                                "exceptionType": (strictValueChecking) ? "IncorrectArgumentValueException" : "IncorrectArgumentTypeException", // Mmm, yes and no
                                "exceptionHandler": throwMockException, // This seems like a flawed concept?
                                "descriptor": name + '()', // We have this information to build up part of a meaningful error msg
                                "delegate": true, // this can be part of curried fn
                                "typed": true // this can be part of curried fn
                              }*/
                              // If match remove exceptions raised during checks and move on to next presentation.
                              exceptions = exceptions.splice(0, cachedExceptionTotal);
                              continue assertPresentations;
                            } else {
                              throwMockException( actual, expected, "IncorrectParameterException", _id + '()' )
                            }

                      } // end assertExpectations loop
                  } // end assertPresentations loop
                }
              }).call(this);
            } // end assertInterface
          } // end assertMethod
      },

      atLeast: function (n) {
        this._min = n;
        this._max = Infinity;
        return this;
      },

      noMoreThan: function (n) {
        this._max = n;
        return this;
      }

    }; // End MockedMember.prototype declaration

    // Backward compatibility for QMock v0.1 API
    __Mock.prototype["withArguments"] = __Mock.prototype.accepts;
    __Mock.prototype["andReturns"] = __Mock.prototype.returns;
    __Mock.prototype["andChain"] = __Mock.prototype.chain;
    __Mock.prototype["callFunctionWith"] = __Mock.prototype.data;

    // PUBLIC METHODS on mock
    // Creates new MockedMember instance on Mock Object and sets-up initial method expectation
    mock.expects = mock.andExpects = function mockExpectsNewMethod ( min, max ) {
      return new __Mock( min, max );
    };

    mock.accepts = function mockExpectsArguments () {
      mock.expectsArguments = slice.call(arguments);
      return mock;
    };

    mock.actualArguments = []; // Stub, used for symbol binding

    // Verify method, tests both constructor and declared method's respective states.
    mock.verify = function verifyMock () {

      // Check Constructor Arguments
      if ( mock.expectsArguments.push ) {
        if ( mock.expectsArguments.length !== mock.actualArguments.length ) {
          // Thrown in to satisfy tests (for consistency's sake) - NEEDS TO BE REFACTORED OUT!
          throwMockException( mock.actualArguments.length, mock.expectsArguments.length, "IncorrectNumberOfArgumentsException", "Constructor function" );
        } else if ( !compare( mock.actualArguments, mock.expectsArguments ) ) {
          throwMockException( mock.actualArguments, mock.expectsArguments, "IncorrectParameterException", "Constructor function" );
            /*{
              "strictValueChecking": mock.strictValueChecking,
              "exceptionHandler": throwMockException,
              "delegate": true,
              "descriptor": "Mock Constructor",
              "typed": true
            }*/
        }
      }

      // Verify Mocked Methods
      for (var i = 0, len = methods.length; i < len; i++) {
        methods[ i ].verifyMethod();
      }

      // Moment of truth...
      if (exceptions.length !== 0) {
        throw exceptions; // D'OH! :(
      } else {
        return true; // WIN! \o/
      }
    };

    // Resets internal state of Mock instance
    mock.reset = function resetMock () {
      exceptions = [];
      this.actualArguments = [];
      for (var i = 0, len = methods.length; i < len; i++) {
        methods[ i ]._calls = 0;
        methods[ i ]._received = [];
      }
    };

    // Backward compatibility for QMock v0.1 API
    mock.expectsArguments = mock.accepts;

    // If params passed to Mock constructor auto-magikally create mocked interface from JSON tree.
    if ( typeof arguments[ 0 ] === "object" ) {
      createMockFromJSON.call( mock, arguments[ 0 ] );
    }

    // On my command, unleash the mock! :-)
    return mock;

  }

  // Expose internal methods for unit tests
  /*if ( undefined !== expose ) {
    // mock generator
    ;;;; assert.expose( createMockFromJSON, "_createMockFromJSON", MockConstructor );
  }*/

  // Expose QMock API
  container.QMock = {
    Mock: Mock,
    config: config,
    version: "0.3" // follow semantic versioning conventions (http://semver.org/)
  };

  // Do I need a setup function a la $.ajax?

  // Alias QMock.Mock for pretty Mock initialisation (i.e. new Mock)
  container.Mock = Mock;

  // QMock was successfully initialised!
  return true;

})( (typeof exports !== "undefined") ? exports : this ); // if exports available assume CommonJS