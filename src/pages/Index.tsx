import { useState } from "react";

export default function Index() {
  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);

  const inputDigit = (digit: string) => {
    if (waitingForOperand) {
      setDisplay(digit);
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? digit : display + digit);
    }
  };

  const inputDecimal = () => {
    if (waitingForOperand) {
      setDisplay("0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
    }
  };

  const clear = () => {
    setDisplay("0");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const performOperation = (nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      let newValue = currentValue;

      switch (operation) {
        case "+":
          newValue = currentValue + inputValue;
          break;
        case "-":
          newValue = currentValue - inputValue;
          break;
        case "×":
          newValue = currentValue * inputValue;
          break;
        case "÷":
          newValue = currentValue / inputValue;
          break;
      }

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = () => {
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      let result = previousValue;

      switch (operation) {
        case "+":
          result = previousValue + inputValue;
          break;
        case "-":
          result = previousValue - inputValue;
          break;
        case "×":
          result = previousValue * inputValue;
          break;
        case "÷":
          result = previousValue / inputValue;
          break;
      }

      setDisplay(String(result));
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
    }
  };

  const toggleSign = () => {
    const value = parseFloat(display);
    setDisplay(String(value * -1));
  };

  const inputPercent = () => {
    const value = parseFloat(display);
    setDisplay(String(value / 100));
  };

  const buttonClass = "h-16 text-xl font-medium rounded-lg transition-colors active:scale-95";
  const numberClass = `${buttonClass} bg-slate-700 hover:bg-slate-600 text-white`;
  const functionClass = `${buttonClass} bg-slate-600 hover:bg-slate-500 text-white`;
  const operationClass = `${buttonClass} bg-orange-500 hover:bg-orange-400 text-white`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-slate-950 border border-slate-700 shadow-2xl rounded-xl overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="bg-slate-900 rounded-lg p-6 mb-4 border border-slate-700">
            <div className="text-right text-5xl font-light text-white break-words min-h-[60px] flex items-center justify-end">
              {display}
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3">
            <button onClick={clear} className={functionClass}>
              AC
            </button>
            <button onClick={toggleSign} className={functionClass}>
              +/-
            </button>
            <button onClick={inputPercent} className={functionClass}>
              %
            </button>
            <button onClick={() => performOperation("÷")} className={operationClass}>
              ÷
            </button>

            <button onClick={() => inputDigit("7")} className={numberClass}>
              7
            </button>
            <button onClick={() => inputDigit("8")} className={numberClass}>
              8
            </button>
            <button onClick={() => inputDigit("9")} className={numberClass}>
              9
            </button>
            <button onClick={() => performOperation("×")} className={operationClass}>
              ×
            </button>

            <button onClick={() => inputDigit("4")} className={numberClass}>
              4
            </button>
            <button onClick={() => inputDigit("5")} className={numberClass}>
              5
            </button>
            <button onClick={() => inputDigit("6")} className={numberClass}>
              6
            </button>
            <button onClick={() => performOperation("-")} className={operationClass}>
              -
            </button>

            <button onClick={() => inputDigit("1")} className={numberClass}>
              1
            </button>
            <button onClick={() => inputDigit("2")} className={numberClass}>
              2
            </button>
            <button onClick={() => inputDigit("3")} className={numberClass}>
              3
            </button>
            <button onClick={() => performOperation("+")} className={operationClass}>
              +
            </button>

            <button onClick={() => inputDigit("0")} className={`${numberClass} col-span-2`}>
              0
            </button>
            <button onClick={inputDecimal} className={numberClass}>
              .
            </button>
            <button onClick={calculate} className={operationClass}>
              =
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
