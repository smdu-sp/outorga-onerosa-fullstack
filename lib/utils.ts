import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function validaCPF_CNPJ(cpf_cnpj: string) {
  const cpfs_invalidos = ['00000000000', '11111111111', '22222222222', '33333333333', '44444444444', '55555555555', '66666666666', '77777777777', '88888888888', '99999999999'];
  const cnpjs_invalidos = ['00000000000000', '11111111111111', '22222222222222', '33333333333333', '44444444444444', '55555555555555', '66666666666666', '77777777777777', '88888888888888', '99999999999999'];
  const cpf_cnpjLimpo = cpf_cnpj.replace(/[^\d]+/g, "");
  if (cpf_cnpjLimpo.length !== 11 && cpf_cnpjLimpo.length !== 14) return false;
  if (cpf_cnpjLimpo.length === 11) {
    if (cpfs_invalidos.includes(cpf_cnpjLimpo)) return false;
    let soma = 0;
    for (let i = 0; i < 9; i++) 
      soma += parseInt(cpf_cnpjLimpo[i]) * (10 - i);
    let resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf_cnpjLimpo[9])) return false;
    soma = 0;
    for (let i = 0; i < 10; i++) 
      soma += parseInt(cpf_cnpjLimpo[i]) * (11 - i);
    resto = (soma * 10) % 11;
    if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf_cnpjLimpo[10])) return false;
    return true; 
  }
  if (cpf_cnpjLimpo.length === 14) {
    if (cnpjs_invalidos.includes(cpf_cnpjLimpo)) return false;
    const b = [ 6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2 ];
    let i = 0, n = 0;
    for (i = 0, n = 0; i < 12; n += +cpf_cnpjLimpo[i] * b[++i]);
    if(+cpf_cnpjLimpo[12] != (((n %= 11) < 2) ? 0 : 11 - n)) return false;
    for (i = 0, n = 0; i <= 12; n += +cpf_cnpjLimpo[i] * b[i++]);
    if(+cpf_cnpjLimpo[13] != (((n %= 11) < 2) ? 0 : 11 - n)) return false;
    return true;
  }
  return false;
}


export function verificaData(dataInicio: string, dataFim: string): [Date, Date] {
  let inicio: Date, fim: Date;
  if (!dataInicio) inicio = new Date();
  else {
    const dataSeparada = dataInicio.split('-');
    inicio = new Date(
      +dataSeparada[2],
      +dataSeparada[1] - 1,
      +dataSeparada[0],
      0, 0, 0
    )
  }
  if (!dataFim) fim = new Date();
  else {
    const dataSeparada = dataFim.split('-');
    fim = new Date(
      +dataSeparada[2],
      +dataSeparada[1] - 1,
      +dataSeparada[0],
      23, 59, 59, 999
    )
  }
  return [inicio, fim];
}
