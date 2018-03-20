// Fusion Grammar
// ==========================

{
  function isObject(item) {
    return (item && typeof item === 'object' && !Array.isArray(item));
  }

  function mergeDeep(target, ...sources) {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
      for (const key in source) {
        if (isObject(source[key])) {
          if (!target[key]) Object.assign(target, { [key]: {} });
          mergeDeep(target[key], source[key]);
        } else {
          Object.assign(target, { [key]: source[key] });
        }
      }
    }

    return mergeDeep(target, ...sources);
  }
}

Root
  = (Include / Definition / Comment)*

Comment
  = LineComment / BlockComment {
    return {
      kind: 'comment'
    };
  }

LineComment
  = _ "#" [^\n]* _

BlockComment
  = _ "/*" (!"*/" .)* "*/" _

Include
  = _ "include:" _ pattern:(StringLiteral / FilePattern) _ {
    let result = {
      kind: 'include',
      pattern
    };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

FilePattern
  = [a-zA-Z.*/_-]+ {
    return text();
  }

Definitions
  = defs:(Definition / Comment)* {
    return defs;
  }

Definition
  = _ def:(PropertyBlock / PropertyDefinition) _ {
    return def;
  }

PropertyBlock
  = path:PropertyPath _ "{" _ defs:Definitions _ "}" {
    let result = {
      kind: 'definition',
      path,
      block: defs
    };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

PropertyDefinition
  = path:PropertyPath _ "=" _ value:(ExpressionLiteral / SimpleValue / ObjectInstance) _ block:DefinitionsBlock? {
    let result = {
      kind: 'definition',
      path,
      value
    };
    if (block !== null) {
      result.block = block;
    }
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

DefinitionsBlock
  = "{" _ defs:Definitions _ "}" {
    return defs;
  }

PropertyPath
  = head:PropertyPathPart tail:(DotPropertyPathPart)* {
    return [head].concat(tail);
  }

DotPropertyPathPart
  = "." path:PropertyPathPart {
    return path;
  }

PropertyPathPart
  = PrototypeName / PropertyName

SimpleValue "simple value"
  = lit:Literal {
    let result = { simpleValue: lit };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

Literal "literal"
  = BooleanLiteral / NumberLiteral / StringLiteral

ObjectInstance
  = name:ObjectName {
    let result = { objectName: name };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

ObjectName
  = [a-zA-Z0-9.:]+ { return text(); }

PropertyName
  = name:(PropertyNameLiteral / StringLiteral) {
    let result = { property: name };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

PropertyNameLiteral
  = "@"? [a-zA-Z0-9:_\-]+ { return text(); }

PrototypeName
  = "prototype(" _ result:PrototypeNameInner _ ")" {
    return result;
  }

PrototypeNameInner
  = name:ObjectName {
    let result = { prototype: name };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

ExpressionLiteral
  = "${" _ exp:Eel_Expression _ "}" {
    let result = { expression: exp };
    if (options.addLocation) {
      result['loc'] = location();
    }
    return result;
  }

_IntegerNumber
  = "-"? [0-9]+
_Decimals
  = "." [0-9]+

NumberLiteral
  = int:_IntegerNumber dec:_Decimals? {
    return parseFloat(text(), 10);
  }

BooleanLiteral "bool"
  = ("false" / "true" / "FALSE" / "TRUE") {
    return text().toLowerCase() === 'true';
  }

DoubleQuotedStringLiteral
  = '"' ('\\"'/[^"])* '"' {
    const s = text();
    return s.substr(1, s.length - 2).replace('\\"', '"');
  }
SingleQuotedStringLiteral
  = "'" ("\\'"/[^'])* "'" {
    const s = text();
    return s.substr(1, s.length - 2).replace('\\\'', '\'');
  }
StringLiteral "string"
  = SingleQuotedStringLiteral / DoubleQuotedStringLiteral

// BasicTypes
Eel_Identifier
  = [a-zA-Z_] [a-zA-Z0-9_-]*
Eel_OffsetAccess
  = '[' _ Eel_Expression _ ']'
Eel_MethodCall
  = Eel_Identifier '(' _ Eel_Expression? _ (',' _ Eel_Expression _ )* ')'
Eel_ObjectPath
  = (Eel_MethodCall / Eel_Identifier) ('.' (Eel_MethodCall / Eel_Identifier) / Eel_OffsetAccess)*
Eel_Term
  = BooleanLiteral !Eel_Identifier / NumberLiteral / StringLiteral / Eel_ObjectPath

// CombinedExpressions
Eel_Expression
  = Eel_ConditionalExpression {
    return text();
  }
Eel_SimpleExpression
  = Eel_WrappedExpression / Eel_NotExpression / Eel_ArrayLiteral / Eel_ObjectLiteral / Eel_Term
Eel_WrappedExpression
  = '(' _ Eel_Expression _ ')'
Eel_NotExpression
  = ("!" / "not" __) _ Eel_SimpleExpression
Eel_ConditionalExpression
  = Eel_Disjunction (_ '?' _ Eel_Expression _ ':' _ Eel_Expression)?
Eel_Disjunction
  = Eel_Conjunction (_ ("||" / "or" __) _ Eel_Conjunction)*
Eel_Conjunction
  = Eel_Comparison ( _ ("&&" / "and" __) _ Eel_Comparison)*
Eel_Comparison
  = Eel_SumCalculation (_ ("==" / "!=" / "<=" / ">=" / "<" / ">") _ Eel_SumCalculation)?
Eel_SumCalculation
  = Eel_ProdCalculation (_ ("+" / "-") _ Eel_ProdCalculation)*
Eel_ProdCalculation
  = Eel_SimpleExpression (_ ("/" / "*" / "%") _ Eel_SimpleExpression)*
Eel_ArrayLiteral
  = '[' _ Eel_Expression? (_ ',' _ Eel_Expression)* _ ']'
Eel_ObjectLiteralProperty
  = (StringLiteral / Eel_Identifier) _ ':' _ Eel_Expression
Eel_ObjectLiteral
  = '{' _ Eel_ObjectLiteralProperty? (_ ',' _ Eel_ObjectLiteralProperty)* _ '}'

// Optional and required whitespace

_ "whitespace"
  = [ \t\n\r]*

__ "required whitespace"
  = [ \t\n\r]+