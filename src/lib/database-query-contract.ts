// Test-only AST inspection; never import this module from application code.
import ts from "typescript";

export type Shape = Map<string, { optional: boolean }>;
export type Schema = { tables: Map<string, Map<string, Shape>>; functions: Map<string, Shape> };

function members(node: ts.TypeNode | undefined): Map<string, ts.PropertySignature> {
  const result = new Map<string, ts.PropertySignature>();
  if (node && ts.isTypeLiteralNode(node)) {
    for (const member of node.members) {
      if (ts.isPropertySignature(member) && member.name)
        result.set(member.name.getText().replaceAll('"', ""), member);
    }
  }
  return result;
}

function shape(node: ts.TypeNode | undefined): Shape {
  return new Map(
    [...members(node)].map(([name, member]) => [name, { optional: !!member.questionToken }]),
  );
}

export function readSchema(source: string): Schema {
  const file = ts.createSourceFile("types.ts", source, ts.ScriptTarget.Latest, true);
  const database = file.statements.find(
    (node): node is ts.TypeAliasDeclaration =>
      ts.isTypeAliasDeclaration(node) && node.name.text === "Database",
  );
  const publicSchema = members(members(database?.type).get("public")?.type);
  return {
    // Views are queried like tables (public_price_quotes is a view in this database).
    tables: new Map(
      [
        ...members(publicSchema.get("Tables")?.type),
        ...members(publicSchema.get("Views")?.type),
      ].map(([table, member]) => [
        table,
        new Map([...members(member.type)].map(([name, part]) => [name, shape(part.type)])),
      ]),
    ),
    functions: new Map(
      [...members(publicSchema.get("Functions")?.type)].map(([name, member]) => [
        name,
        shape(members(member.type).get("Args")?.type),
      ]),
    ),
  };
}

const columnMethods = new Set([
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "is",
  "contains",
  "containedBy",
  "overlaps",
  "order",
  "filter",
]);

export function inspectQueries(source: string, filename: string, schema: Schema) {
  const file = ts.createSourceFile(
    filename,
    source,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const errors: string[] = [];
  let queries = 0;
  let columns = 0;
  let writes = 0;
  const deferredWrites: string[] = [];
  const declarations = new Map<string, ts.Expression>();
  function collect(node: ts.Node) {
    if (ts.isVariableDeclaration(node) && ts.isIdentifier(node.name) && node.initializer)
      declarations.set(node.name.text, node.initializer);
    ts.forEachChild(node, collect);
  }
  collect(file);
  const literal = (node: ts.Node | undefined) =>
    node && ts.isStringLiteralLike(node) ? node.text : undefined;
  const fail = (node: ts.Node, message: string) =>
    errors.push(
      `${filename}:${file.getLineAndCharacterOfPosition(node.getStart()).line + 1}: ${message}`,
    );

  function tablesFor(node: ts.Expression, seen = new Set<string>()): string[] | undefined {
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) return undefined;
      seen.add(node.text);
      const init = declarations.get(node.text);
      return init ? tablesFor(init, seen) : undefined;
    }
    if (!ts.isCallExpression(node) || !ts.isPropertyAccessExpression(node.expression))
      return undefined;
    const method = node.expression.name.text;
    if (method !== "from") return tablesFor(node.expression.expression, seen);
    if (node.expression.expression.getText(file) === "Array") return undefined;
    const name = literal(node.arguments[0]);
    if (name) return [name];
    // The importer's validated enum is the only dynamic table source currently used.
    if (
      node.arguments[0]?.getText(file) === "data.target" &&
      filename.endsWith("admin-console.functions.ts")
    ) {
      const targets: string[] = [];
      function findTarget(child: ts.Node) {
        if (
          ts.isPropertyAssignment(child) &&
          child.name.getText(file) === "target" &&
          ts.isCallExpression(child.initializer)
        ) {
          const argument = child.initializer.arguments[0];
          if (
            child.initializer.expression.getText(file) === "z.enum" &&
            argument &&
            ts.isArrayLiteralExpression(argument)
          ) {
            for (const value of argument.elements) {
              const target = literal(value);
              if (target) targets.push(target);
            }
          }
        }
        ts.forEachChild(child, findTarget);
      }
      findTarget(file);
      if (targets.length) return targets;
    }
    fail(node, "Unreviewed dynamic table name");
    return [];
  }

  function checkColumns(node: ts.Node, names: string[], fields: string[]) {
    for (const name of names)
      for (const field of fields) {
        columns++;
        if (!schema.tables.get(name)?.get("Row")?.has(field))
          fail(node, `${name}: unknown column ${field}`);
      }
  }

  function objectKeys(
    node: ts.Expression | undefined,
    seen = new Set<string>(),
  ): string[] | undefined {
    if (!node) return undefined;
    if (ts.isParenthesizedExpression(node) || ts.isAsExpression(node))
      return objectKeys(node.expression, seen);
    if (ts.isConditionalExpression(node)) {
      const left = objectKeys(node.whenTrue, new Set(seen));
      const right = objectKeys(node.whenFalse, new Set(seen));
      return left && right ? [...new Set([...left, ...right])] : undefined;
    }
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "map"
    ) {
      const callback = node.arguments[0];
      if (callback && ts.isArrowFunction(callback) && !ts.isBlock(callback.body))
        return objectKeys(callback.body, seen);
    }
    if (ts.isIdentifier(node)) {
      if (seen.has(node.text)) return undefined;
      seen.add(node.text);
      return objectKeys(declarations.get(node.text), seen);
    }
    if (!ts.isObjectLiteralExpression(node)) return undefined;
    const keys: string[] = [];
    for (const property of node.properties) {
      if (ts.isSpreadAssignment(property)) {
        const spread = objectKeys(property.expression, new Set(seen));
        if (!spread) return undefined;
        keys.push(...spread);
      } else if (property.name && !ts.isComputedPropertyName(property.name))
        keys.push(property.name.getText(file).replaceAll('"', ""));
      else return undefined;
    }
    return keys;
  }

  function visit(node: ts.Node) {
    if (ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression)) {
      const method = node.expression.name.text;
      const names = tablesFor(node);
      if (method === "from" && names) {
        queries++;
        for (const name of names) if (!schema.tables.has(name)) fail(node, `unknown table ${name}`);
      }
      if (names && columnMethods.has(method)) {
        const field = literal(node.arguments[0]);
        if (field) checkColumns(node, names, [field]);
        else fail(node, `Unreviewed dynamic ${method} column`);
      }
      if (names && method === "select" && node.arguments.length) {
        const selection = literal(node.arguments[0]);
        if (selection === undefined) fail(node, "Unreviewed dynamic select");
        else if (selection !== "*")
          checkColumns(
            node,
            names,
            selection.split(",").map((field) => field.trim()),
          );
      }
      if (names && ["insert", "upsert", "update"].includes(method)) {
        writes++;
        const keys = objectKeys(node.arguments[0]);
        if (!keys)
          deferredWrites.push(`${filename}: ${method}(${node.arguments[0]?.getText(file) ?? ""})`);
        if (keys)
          for (const name of names) {
            const part = schema.tables.get(name)?.get(method === "update" ? "Update" : "Insert");
            for (const key of keys)
              if (!part?.has(key)) fail(node, `${name}: unknown write field ${key}`);
            for (const [key, value] of part ?? [])
              if (!value.optional && !keys.includes(key))
                fail(node, `${name}: missing required write field ${key}`);
          }
        const options = node.arguments[1];
        if (options && ts.isObjectLiteralExpression(options))
          for (const property of options.properties) {
            if (ts.isPropertyAssignment(property) && property.name.getText(file) === "onConflict") {
              const conflict = literal(property.initializer);
              if (conflict)
                checkColumns(
                  node,
                  names,
                  conflict.split(",").map((field) => field.trim()),
                );
            }
          }
      }
      if (method === "rpc") {
        const name = literal(node.arguments[0]);
        const args = name ? schema.functions.get(name) : undefined;
        if (!args) fail(node, `unknown RPC ${name ?? "<dynamic>"}`);
        else {
          const keys = objectKeys(node.arguments[1]) ?? [];
          for (const key of keys)
            if (!args.has(key)) fail(node, `${name}: unknown RPC argument ${key}`);
          for (const [key, value] of args)
            if (!value.optional && !keys.includes(key))
              fail(node, `${name}: missing RPC argument ${key}`);
        }
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return { errors: [...new Set(errors)], queries, columns, writes, deferredWrites };
}
