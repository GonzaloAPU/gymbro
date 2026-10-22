/** Los JWT de una cuenta archivada dejan de habilitar acceso aunque no hayan vencido. */
import {User} from '../models/index.js';
export const accountAccess={isActive:async id=>typeof id==='string'&&Boolean(await User.findByPk(id,{attributes:['id']}))};
export async function requireActiveAccount(req,res,next){
  try{
    if(!await accountAccess.isActive(req.auth.sub))return res.status(401).json({message:'La cuenta no está disponible. Iniciá sesión nuevamente.'});
    next();
  }catch(error){next(error);}
}
