const prev = { name: "John", age: 30 };
const safeData = { name: undefined, age: 31 };
console.log({ ...prev, ...safeData });
